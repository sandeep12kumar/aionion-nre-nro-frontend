import { useCallback, useEffect, useMemo, useState } from "react";
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
  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-slate-950 text-white">
      <div className="relative min-h-0 flex-1">
        <VideoTile stream={call.remoteStream} label="Relationship Manager" className="h-full w-full" />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-base font-medium">
              {call.status === "waiting" ? "Waiting for your Relationship Manager to join" : STATUS_LABEL[call.status]}
            </p>
            <p className="text-sm text-slate-300">Please keep this page open and your documents ready.</p>
          </div>
        )}
        <div className="absolute right-3 top-3 w-28 overflow-hidden rounded-xl border border-white/30 shadow-lg sm:w-48">
          <VideoTile stream={media.stream} muted mirrored={media.facing === "user"} label="Your video" className="aspect-[3/4] w-full sm:aspect-video" />
        </div>
        {request && connected && (
          <div className="absolute inset-x-3 bottom-3 mx-auto max-w-lg rounded-xl bg-white p-4 text-slate-900 shadow-lg" role="status">
            <p className="text-sm font-semibold">Please show: {request.label}</p>
            <p className="mt-0.5 text-xs text-slate-600">{request.instruction} Hold it still until your RM confirms.</p>
          </div>
        )}
        {captured && (
          <div className="absolute inset-x-3 bottom-3 mx-auto max-w-lg rounded-xl bg-emerald-600 p-3 text-center text-sm font-semibold shadow-lg" role="status">
            ✓ {captured} saved — thank you
          </div>
        )}
      </div>
      {(media.error || call.error) && <div className="p-3"><ErrorBanner message={media.error || call.error} /></div>}
      <div className="flex flex-wrap items-center justify-center gap-2 p-3">
        <Button variant={media.micOn ? "dark" : "danger"} small onClick={media.toggleMic}>{media.micOn ? "Mute" : "Unmute"}</Button>
        <Button variant={media.cameraOn ? "dark" : "danger"} small onClick={media.toggleCamera}>{media.cameraOn ? "Camera off" : "Camera on"}</Button>
        <Button variant="dark" small onClick={media.switchCamera}>Switch camera</Button>
        <span className="text-xs text-slate-300">{STATUS_LABEL[call.status]}</span>
      </div>
      {documents?.length > 0 && !connected && (
        <p className="pb-3 text-center text-xs text-slate-400">Keep ready: {documents.map((d) => d.label).join(" · ")}</p>
      )}
    </div>
  );
}
