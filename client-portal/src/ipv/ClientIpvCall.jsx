import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/aionion-logo.png";
import { Button, ErrorBanner, VideoTile } from "./ipvUi";
import { useLocalMedia } from "./useLocalMedia";
import { STATUS_LABEL, useIpvCall } from "./useIpvCall";
import { errorMessage, ipvApi } from "./ipvApi";

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share your location. Please use an up-to-date Chrome, Safari or Edge."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (failure) => reject(new Error(failure.code === failure.PERMISSION_DENIED
      ? "Location access is blocked. Allow location for this site (the icon in the address bar), then try again."
      : "We couldn't find your location. Turn on location services on your device, then try again.")), {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

// The client's side of the video IPV (opened from the Video IPV step):
// allow camera, microphone and location, wait for the RM, then show each
// document when the RM asks. onEnded("completed" | "cancelled").
export default function ClientIpvCall({ token, documents, onEnded, onClose }) {
  const api = useMemo(() => ipvApi(token), [token]);
  const media = useLocalMedia();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(null);
  const [captured, setCaptured] = useState(null);

  const onEvent = useCallback((event, data) => {
    if (event === "doc:request") {
      setRequest(data);
      setCaptured(null);
    } else if (event === "doc:clear") setRequest(null);
    else if (event === "doc:captured") {
      setRequest(null);
      setCaptured(data?.label || "Document");
    } else if (event === "session:ended") {
      media.stop();
      onEnded(data?.status || "cancelled");
    }
  }, [media, onEnded]);
  const call = useIpvCall({ token, role: "client", localStream: media.stream, active: ready, onEvent });

  useEffect(() => {
    if (!captured) return undefined;
    const timer = setTimeout(() => setCaptured(null), 4000);
    return () => clearTimeout(timer);
  }, [captured]);

  useEffect(() => {
    if (!ready) return undefined;
    const elements = [document.documentElement, document.body];
    const previous = elements.map((element) => element.style.overflow);
    elements.forEach((element) => { element.style.overflow = "hidden"; });
    return () => elements.forEach((element, index) => { element.style.overflow = previous[index]; });
  }, [ready]);

  const begin = async () => {
    setBusy(true);
    setError("");
    try {
      const position = await getLocation();
      await api.post("/ipv/location", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      if (await media.start("user")) setReady(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          By continuing, you agree to share your camera, microphone and current location with Aionion Capital for this
          verification. Your location is recorded with the IPV.
        </p>
        <ErrorBanner message={error || media.error} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={begin} disabled={busy} className="bg-[var(--regime-color)]">
            {busy ? "Please allow access in your browser…" : "Allow camera, microphone & location"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        </div>
      </div>
    );
  }

  const connected = call.status === "connected";
  return createPortal(
    <div className="fixed inset-0 z-50 grid h-[100dvh] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label="Video verification">
      <header className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-slate-900 sm:px-6 sm:py-3" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <img src={logo} alt="Aionion Capital" className="h-auto w-36 shrink-0 object-contain sm:w-44" />
        <div className="min-w-0 text-right">
          <h1 className="text-sm font-bold sm:text-base">Video verification</h1>
          <p className="text-xs text-slate-500" role="status">{STATUS_LABEL[call.status]}</p>
        </div>
      </header>
      <div className="relative min-h-0 min-w-0 overflow-hidden">
        <VideoTile stream={media.stream} muted mirrored={media.facing === "user"} label="Your video" className="absolute inset-0 h-full w-full !object-contain" />
        <span className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-semibold">You</span>
        {!media.cameraOn && <p className="absolute inset-0 flex items-center justify-center text-sm">Your camera is off</p>}
        <div className="absolute right-3 top-3 w-28 overflow-hidden rounded-xl border border-white/30 bg-slate-900 shadow-lg sm:w-48 lg:w-56">
          <VideoTile stream={call.remoteStream} label="Relationship Manager" className="aspect-video w-full" />
          <p className="bg-slate-900 px-2 py-1 text-center text-[10px] font-semibold sm:text-xs">Relationship Manager</p>
        </div>
      </div>
      <footer className="max-h-[45dvh] space-y-2 overflow-y-auto border-t border-slate-800 px-3 pt-2 sm:px-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {!connected && (
          <div className="text-center" role="status">
            <p className="text-sm font-medium">{call.status === "waiting" ? "Waiting for your Relationship Manager to join" : STATUS_LABEL[call.status]}</p>
            <p className="text-xs text-slate-300">Please keep this page open and your documents ready.</p>
          </div>
        )}
        {request && connected && (
          <div className="mx-auto max-w-lg rounded-xl bg-white p-3 text-slate-900" role="status">
            <p className="text-sm font-semibold">Please show: {request.label}</p>
            <p className="mt-0.5 text-xs text-slate-600">{request.instruction} Hold it still until your RM confirms.</p>
          </div>
        )}
        {captured && <p className="mx-auto max-w-lg rounded-xl bg-emerald-600 p-2 text-center text-sm font-semibold" role="status">{captured} saved — thank you</p>}
        <ErrorBanner message={media.error || call.error} />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant={media.micOn ? "dark" : "danger"} small onClick={media.toggleMic}>{media.micOn ? "Mute" : "Unmute"}</Button>
          <Button variant={media.cameraOn ? "dark" : "danger"} small onClick={media.toggleCamera}>{media.cameraOn ? "Camera off" : "Camera on"}</Button>
          <Button variant="dark" small onClick={media.switchCamera}>Switch camera</Button>
        </div>
        {documents?.length > 0 && !connected && <p className="text-center text-xs text-slate-400">Keep ready: {documents.map((d) => d.label).join(" · ")}</p>}
      </footer>
    </div>,
    document.body,
  );
}
