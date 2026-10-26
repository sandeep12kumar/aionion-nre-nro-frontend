import { useEffect, useRef, useState } from "react";

// Full-screen live camera capture: shows the device camera, lets the user
// snap a photo, review it, retake or confirm. Produces a File the same
// shape as a regular file-input selection so callers don't need to branch.
export default function CameraCapture({ title = "Capture photo", onCapture, onClose, facingMode = "environment" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera capture isn't supported in this browser. Please upload a file instead.");
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access was denied or unavailable. Please upload a file instead."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.92));
  };

  const usePhoto = () => {
    canvasRef.current.toBlob(
      (blob) => {
        onCapture(new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" onClick={onClose} className="text-2xl leading-none">
          &times;
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white">{error}</div>
        ) : photoDataUrl ? (
          <img src={photoDataUrl} alt="Captured" className="h-full w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!error && (
        <div className="flex items-center justify-center gap-4 bg-black py-6">
          {photoDataUrl ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                className="rounded-full border border-white px-5 py-2.5 text-sm font-semibold text-white"
              >
                Retake
              </button>
              <button type="button" onClick={usePhoto} className="rounded-full bg-[var(--regime-color)] px-6 py-2.5 text-sm font-semibold text-white">
                Use photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={takePhoto}
              aria-label="Take photo"
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20"
            />
          )}
        </div>
      )}
    </div>
  );
}
