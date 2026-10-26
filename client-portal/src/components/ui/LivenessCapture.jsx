import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

// Full-screen live-photo capture with a mandatory GPS fix. Once exactly one
// face is steadily in frame, a 2-second clip is analysed with face-api's tiny
// detector: every sampled frame must contain exactly one face (a second
// person aborts the clip), and the most confident, best-centred frame becomes
// the photo. The clip itself is only analysed in the browser, not uploaded.
// Without a usable latitude/longitude the capture never starts.

const MODEL_URL = "/models";
// low threshold so a second (partial / background) face is still noticed
const DETECT_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });

const MIN_FACE_SCORE = 0.6; // the applicant's own face must be a confident detection
const READY_HITS_REQUIRED = 3; // consecutive good frames before the clip starts
const CLIP_MS = 2000;
const MAX_MISSED_FRAMES = 3; // detector blips allowed during the clip (no face, not two faces)
const MIN_CLIP_SAMPLES = 4;

function requestPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      reject,
      options,
    );
  });
}

// High accuracy first; laptops/desktops without GPS often fail that with
// POSITION_UNAVAILABLE, so fall back to network (Wi-Fi/IP) location.
async function getLocation() {
  if (!navigator.geolocation) {
    throw new Error("This browser can't provide location. A location fix is required to continue.");
  }
  try {
    return await requestPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  } catch (err) {
    if (err.code !== err.PERMISSION_DENIED) {
      try {
        return await requestPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 });
      } catch (fallbackErr) {
        err = fallbackErr;
      }
    }
    const msg =
      err.code === err.PERMISSION_DENIED
        ? "Location access was blocked. Enable location for this site and tap Retry — the live photo can't be recorded without it."
        : err.code === err.TIMEOUT
          ? "Getting your location timed out. Move somewhere with a clearer signal and tap Retry."
          : "Your location is unavailable. Turn on your device's location services (on Windows: Settings → Privacy & security → Location) and tap Retry.";
    throw new Error(msg);
  }
}

// What's wrong with the current frame, or null if it's usable.
function frameProblem(detections, vw) {
  if (detections.length === 0) return "No face detected — look at the camera";
  if (detections.length > 1) return "Only one person is allowed in the frame";
  const d = detections[0];
  if (d.score < MIN_FACE_SCORE) return "Face not clear — improve the lighting";
  const boxW = d.box.width / vw;
  const cx = (d.box.x + d.box.width / 2) / vw;
  if (boxW < 0.18) return "Move closer to the camera";
  if (boxW > 0.8) return "Move a little further back";
  if (Math.abs(cx - 0.5) > 0.15) return "Centre your face in the circle";
  return null;
}

export default function LivenessCapture({ title = "Live photo capture", onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const runIdRef = useRef(0);
  const locationRef = useRef(null);
  const pendingResultRef = useRef(null);

  const [phase, setPhase] = useState("locating"); // locating | starting | aligning | recording | preview | error
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(null);

  const stopEverything = useCallback(() => {
    runIdRef.current += 1;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopEverything(), [stopEverything]);

  const fail = useCallback((message) => {
    stopEverything();
    setErrorMsg(message);
    setPhase("error");
  }, [stopEverything]);

  // ---- step 3: finish -- store the best frame + metadata ---------------
  const finishClip = useCallback(async (myRun, clip) => {
    try {
      locationRef.current = await getLocation();
    } catch (error) {
      // keep the fix taken before the clip rather than throwing away a good capture
      if (!locationRef.current) {
        if (myRun === runIdRef.current) fail(error.message);
        return;
      }
    }
    if (myRun !== runIdRef.current) return;

    const liveness = {
      method: "video_clip_single_face_v1",
      model: "tiny_face_detector",
      passed: true,
      startedAt: clip.startedAt,
      completedAt: new Date().toISOString(),
      metrics: {
        clipMs: CLIP_MS,
        samples: clip.samples,
        singleFaceFrames: clip.singleFaceFrames,
        missedFrames: clip.missedTotal,
        bestScore: round(clip.bestScore),
      },
    };
    pendingResultRef.current = { liveness, location: locationRef.current };

    stopEverything();
    setPhotoUrl(canvasRef.current.toDataURL("image/jpeg", 0.92));
    setPhase("preview");
  }, [fail, stopEverything]);

  // ---- step 2b: detection loop -- align, then record the 2s clip --------
  const runDetectionLoop = useCallback(() => {
    const myRun = ++runIdRef.current;
    let readyHits = 0;
    let clip = null; // set while recording

    const tick = async () => {
      if (myRun !== runIdRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      let detections = [];
      try {
        detections = await faceapi.detectAllFaces(video, DETECT_OPTS);
      } catch {
        // transient - keep going
      }
      if (myRun !== runIdRef.current) return;

      const vw = video.videoWidth || 1;
      const problem = frameProblem(detections, vw);

      if (!clip) {
        // aligning: wait for a few consecutive usable frames
        setHint(problem || "Hold still…");
        readyHits = problem ? 0 : readyHits + 1;
        if (readyHits >= READY_HITS_REQUIRED) {
          clip = {
            startedAt: new Date().toISOString(),
            startMs: performance.now(),
            samples: 0,
            singleFaceFrames: 0,
            missedInRow: 0,
            missedTotal: 0,
            bestScore: 0,
          };
          setProgress(0);
          setPhase("recording");
          setHint("Recording — keep looking at the camera");
        }
      } else {
        // recording: a second face aborts; brief detector misses are tolerated
        clip.samples += 1;
        if (detections.length > 1) {
          clip = null;
          readyHits = 0;
          setPhase("aligning");
          setHint("Only one person is allowed in the frame — starting again");
        } else if (problem) {
          clip.missedInRow += 1;
          clip.missedTotal += 1;
          if (clip.missedInRow > MAX_MISSED_FRAMES) {
            clip = null;
            readyHits = 0;
            setPhase("aligning");
            setHint(`${problem} — starting again`);
          }
        } else {
          clip.missedInRow = 0;
          clip.singleFaceFrames += 1;
          const d = detections[0];
          const cx = (d.box.x + d.box.width / 2) / vw;
          const quality = d.score - Math.abs(cx - 0.5) * 0.5;
          if (quality > clip.bestScore) {
            clip.bestScore = quality;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);
          }
        }

        if (clip) {
          const elapsed = performance.now() - clip.startMs;
          setProgress(Math.min(1, elapsed / CLIP_MS));
          if (elapsed >= CLIP_MS) {
            if (clip.singleFaceFrames >= MIN_CLIP_SAMPLES && clip.bestScore > 0) {
              const done = clip;
              clip = null;
              setHint("Saving…");
              finishClip(myRun, done);
              return;
            }
            clip = null;
            readyHits = 0;
            setPhase("aligning");
            setHint("Couldn't see your face clearly — starting again");
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [finishClip]);

  // ---- step 2: camera + models --------------------------------------
  const startCameraAndModels = useCallback(async () => {
    setPhase("starting");
    setErrorMsg("");
    setHint("");
    setProgress(0);

    try {
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      }
    } catch {
      fail("Couldn't load the face check. Check your connection and tap Retry.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      fail("Camera access was denied or unavailable. Allow camera access and tap Retry.");
      return;
    }

    setPhase("aligning");
    runDetectionLoop();
  }, [fail, runDetectionLoop]);

  // ---- step 1: location (blocking) -------------------------------------
  const acquireLocation = useCallback(async () => {
    setPhase("locating");
    setErrorMsg("");
    try {
      locationRef.current = await getLocation();
      startCameraAndModels();
    } catch (err) {
      locationRef.current = null;
      setErrorMsg(err.message);
      setPhase("error");
    }
  }, [startCameraAndModels]);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  const usePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const meta = pendingResultRef.current;
    if (!canvas?.width || !canvas?.height || !meta?.location || !meta?.liveness) {
      setErrorMsg("The photo capture is incomplete. Please retake the photo.");
      setPhase("error");
      return;
    }
    try {
      canvas.toBlob((blob) => {
        if (!blob || !blob.size) {
          setErrorMsg("The browser could not create the photo file. Please retake the photo.");
          setPhase("error");
          return;
        }
        const file = new File([blob], `live_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file, meta);
      }, "image/jpeg", 0.92);
    } catch (error) {
      console.error("Live photo encoding failed:", error);
      setErrorMsg("The browser could not process the photo. Reopen the camera and retake it.");
      setPhase("error");
    }
  }, [onCapture]);

  const retake = useCallback(() => {
    setPhotoUrl(null);
    pendingResultRef.current = null;
    startCameraAndModels();
  }, [startCameraAndModels]);

  const retryFromError = useCallback(() => {
    if (!locationRef.current) acquireLocation();
    else startCameraAndModels();
  }, [acquireLocation, startCameraAndModels]);

  const live = phase === "aligning" || phase === "recording";
  const RING_R = 130;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" onClick={onClose} className="text-2xl leading-none" aria-label="Close">
          &times;
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {photoUrl ? (
          <img src={photoUrl} alt="Captured" className="h-full w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-contain"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {(phase === "locating" || phase === "starting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-8 text-center">
            <Spinner />
            <p className="text-sm">
              {phase === "locating" ? "Getting your location…" : "Starting camera and face check…"}
            </p>
          </div>
        )}

        {live && (
          <>
            <svg
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              width="276"
              height="276"
              viewBox="0 0 276 276"
            >
              <circle cx="138" cy="138" r={RING_R} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
              {phase === "recording" && (
                <circle
                  cx="138"
                  cy="138"
                  r={RING_R}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - progress)}
                  transform="rotate(-90 138 138)"
                />
              )}
            </svg>
            <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 px-6 text-center">
              {phase === "recording" && (
                <span className="flex items-center gap-2 text-xs font-semibold text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC
                </span>
              )}
              <p className="text-lg font-semibold drop-shadow">{hint || "Look at the camera"}</p>
              <p className="text-xs text-white/70">Only you should be in the frame</p>
            </div>
          </>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8 text-center">
            <p className="text-sm text-red-300">{errorMsg}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={retryFromError}
                className="rounded-full bg-[var(--regime-color)] px-6 py-2.5 text-sm font-semibold text-white"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white px-5 py-2.5 text-sm font-semibold text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === "preview" && (
        <div className="flex items-center justify-center gap-4 bg-black py-6">
          <button
            type="button"
            onClick={retake}
            className="rounded-full border border-white px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retake
          </button>
          <button
            type="button"
            onClick={usePhoto}
            className="rounded-full bg-[var(--regime-color)] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Use photo
          </button>
        </div>
      )}
    </div>
  );
}

function round(n) {
  return typeof n === "number" ? Math.round(n * 1000) / 1000 : null;
}

function Spinner() {
  return (
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
  );
}
