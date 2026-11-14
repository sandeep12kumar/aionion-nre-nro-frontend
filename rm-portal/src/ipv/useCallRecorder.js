import { useCallback, useEffect, useRef, useState } from "react";

// Records the video IPV in the RM's browser: the client's video full frame,
// the RM's own camera in a corner, and both voices -- and uploads it while
// the call goes on (server: ipvController recording endpoints).
//   S3: parts of at least 5 MB go straight to S3 through links the backend
//       signs (S3 multipart upload); the backend closes the upload at stop.
//   local (no bucket): the parts go through the backend.
// The recording continues if the client's video drops and comes back (the
// canvas keeps drawing whatever the <video> shows).

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 15;
const PART_BYTES = 5.5 * 1024 * 1024; // S3's minimum part is 5 MB (except the last)

function pickMimeType() {
  const candidates = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
}

export function useCallRecorder({ api, remoteVideo, remoteStream, localStream }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const state = useRef(null);

  // the client's audio can change when the call reconnects: keep it wired up
  useEffect(() => {
    const s = state.current;
    if (!s || !remoteStream) return;
    try {
      s.remoteSource?.disconnect();
      if (remoteStream.getAudioTracks().length) {
        s.remoteSource = s.audio.createMediaStreamSource(remoteStream);
        s.remoteSource.connect(s.mix);
      }
    } catch {
      /* the recording carries on without the new audio */
    }
  }, [remoteStream]);

  const uploadPart = useCallback(async (s, blob) => {
    if (!blob.size) return;
    if (s.mode === "s3") {
      s.partNumber += 1;
      const { data } = await api.post("/ipv/recording/part", { partNumber: s.partNumber });
      const response = await fetch(data.url, { method: "PUT", body: blob });
      if (!response.ok) throw new Error(`upload failed (${response.status})`);
    } else {
      await api.post("/ipv/recording/chunk", blob, { headers: { "Content-Type": "application/octet-stream" } });
    }
  }, [api]);

  // parts go up one at a time, in order
  const queue = useCallback((s, blob) => {
    s.uploading = s.uploading.then(() => uploadPart(s, blob)).catch((err) => {
      console.warn("[IPV] recording upload failed", err);
      setError("Part of the call recording couldn't be uploaded. Check your connection.");
    });
  }, [uploadPart]);

  const start = useCallback(async () => {
    if (state.current || !window.MediaRecorder) {
      if (!window.MediaRecorder) setError("This browser can't record the call. Please use an up-to-date Chrome or Edge.");
      return;
    }
    const mimeType = pickMimeType();
    let mode;
    try {
      ({ data: { mode } } = await api.post("/ipv/recording/start", { mimeType: mimeType || "video/webm" }));
    } catch (err) {
      setError(err.response?.data?.message || "The call recording couldn't be started.");
      return;
    }

    // picture: the client full frame, the RM in the bottom-right corner
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    const own = document.createElement("video");
    own.muted = true;
    own.playsInline = true;
    own.srcObject = localStream || null;
    own.play().catch(() => {});
    const draw = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const v = remoteVideo.current;
      if (v?.videoWidth) {
        const scale = Math.min(WIDTH / v.videoWidth, HEIGHT / v.videoHeight);
        const w = v.videoWidth * scale;
        const h = v.videoHeight * scale;
        ctx.drawImage(v, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
      }
      if (own.videoWidth) {
        const w = 240;
        const h = (own.videoHeight / own.videoWidth) * w;
        ctx.drawImage(own, WIDTH - w - 16, HEIGHT - h - 16, w, h);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(12, 12, 250, 26);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST", 20, 30);
    };
    const timer = setInterval(draw, 1000 / FPS);

    // sound: both voices mixed
    const audio = new AudioContext();
    const mix = audio.createMediaStreamDestination();
    let remoteSource = null;
    try {
      if (localStream?.getAudioTracks().length) audio.createMediaStreamSource(localStream).connect(mix);
      if (remoteStream?.getAudioTracks().length) {
        remoteSource = audio.createMediaStreamSource(remoteStream);
        remoteSource.connect(mix);
      }
    } catch {
      /* record without sound rather than not at all */
    }

    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...mix.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_200_000 });
    const s = { recorder, timer, audio, mix, remoteSource, own, mode, partNumber: 0, buffer: [], bufferBytes: 0, uploading: Promise.resolve() };
    state.current = s;
    recorder.ondataavailable = (e) => {
      if (!e.data?.size) return;
      s.buffer.push(e.data);
      s.bufferBytes += e.data.size;
      // S3 parts must be >= 5 MB; locally every few seconds is fine
      if (s.mode !== "s3" || s.bufferBytes >= PART_BYTES) {
        queue(s, new Blob(s.buffer, { type: recorder.mimeType }));
        s.buffer = [];
        s.bufferBytes = 0;
      }
    };
    recorder.start(4000);
    setRecording(true);
    setError("");
  }, [api, localStream, queue, remoteStream, remoteVideo]);

  // Stops recording, uploads the rest and saves the file. Safe to call twice.
  const stop = useCallback(async () => {
    const s = state.current;
    if (!s) return;
    state.current = null;
    setRecording(false);
    await new Promise((resolve) => {
      if (s.recorder.state === "inactive") return resolve();
      s.recorder.addEventListener("stop", resolve, { once: true });
      s.recorder.stop();
    });
    clearInterval(s.timer);
    s.own.srcObject = null;
    s.audio.close().catch(() => {});
    // the last part may be under 5 MB
    if (s.bufferBytes) queue(s, new Blob(s.buffer, { type: s.recorder.mimeType }));
    s.buffer = [];
    s.bufferBytes = 0;
    await s.uploading;
    await api.post("/ipv/recording/stop").catch(() => {});
  }, [api, uploadPart]);

  // leaving the page without stopping: the backend keeps what was uploaded
  useEffect(() => () => {
    const s = state.current;
    if (s) {
      clearInterval(s.timer);
      if (s.recorder.state !== "inactive") s.recorder.stop();
    }
  }, []);

  return { recording, error, start, stop };
}
