import { useCallback, useEffect, useRef, useState } from "react";

function mediaError(err) {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
    return "Camera or microphone access is blocked. Allow it for this site (the icon in the address bar), then try again.";
  }
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") return "No camera or microphone was found on this device.";
  if (err?.name === "NotReadableError") return "Your camera or microphone is being used by another app. Close it and try again.";
  return "Your camera or microphone could not be started. Please try again.";
}

// The camera + microphone. start() asks for them (call it from a click, so
// mobile browsers allow it); switchCamera() swaps front / back camera --
// the back camera shows documents more clearly on a phone.
export function useLocalMedia() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facing, setFacing] = useState("user");
  const current = useRef(null);

  const stop = useCallback(() => {
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
  }, []);

  const start = useCallback(async (facingMode = "user") => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use a camera. Please use an up-to-date Chrome, Safari or Edge.");
      return null;
    }
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      current.current?.getTracks().forEach((t) => t.stop());
      current.current = next;
      next.getAudioTracks().forEach((t) => { t.enabled = micOn; });
      setFacing(facingMode);
      setCameraOn(true);
      setStream(next);
      return next;
    } catch (err) {
      setError(mediaError(err));
      return null;
    }
  }, [micOn]);

  useEffect(() => () => current.current?.getTracks().forEach((t) => t.stop()), []);

  const toggleMic = () => {
    const next = !micOn;
    current.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  };
  const toggleCamera = () => {
    const next = !cameraOn;
    current.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCameraOn(next);
  };
  const switchCamera = () => start(facing === "user" ? "environment" : "user");

  return { stream, error, micOn, cameraOn, facing, start, stop, toggleMic, toggleCamera, switchCamera };
}
