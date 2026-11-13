import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ErrorBanner, Header, VideoTile, formatTime, useElapsed } from "./ipvUi";
import { useLocalMedia } from "./useLocalMedia";
import { STATUS_LABEL, useIpvCall } from "./useIpvCall";
import { errorMessage, ipvApi } from "./ipvApi";

// A JPEG of the client's video as it is now (full camera resolution).
function grabFrame(video) {
  if (!video?.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function LocationPanel({ location }) {
  if (!location) return <Panel title="Client location"><p className="text-sm text-slate-500">Not shared yet — the client shares it before joining.</p></Panel>;
  const lat = Number(location.latitude).toFixed(6);
  const lng = Number(location.longitude).toFixed(6);
  return (
    <Panel title="Client location">
      <Detail label="Place" value={location.place || "Place name not available"} />
      <Detail label="Latitude, longitude" value={`${lat}, ${lng}`} />
      <Detail label="Accuracy" value={location.accuracy != null ? `within ${Math.round(location.accuracy)} m` : null} />
      <Detail label="Recorded" value={formatTime(location.recordedAt)} />
      <a className="text-sm font-semibold text-brand-blue hover:underline" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
        Open in Google Maps
      </a>
    </Panel>
  );
}

// The RM's side of the video IPV, full screen over rm-portal's last page:
// see the client, ask for each document, save a frame of it, then complete
// the IPV (the report PDF is made then). onClose(status) when it ends or the
// RM leaves the call.
export default function RmIpvCall({ token, onClose }) {
  useEffect(() => {
    const elements = [document.documentElement, document.body];
    const previous = elements.map((element) => element.style.overflow);
    elements.forEach((element) => { element.style.overflow = "hidden"; });
    return () => elements.forEach((element, index) => { element.style.overflow = previous[index]; });
  }, []);
  const api = useMemo(() => ipvApi(token), [token]);
  const media = useLocalMedia();
  const remoteVideo = useRef(null);
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [location, setLocation] = useState(null);
  const [saved, setSaved] = useState({});
  const [thumbs, setThumbs] = useState({});
  const [open, setOpen] = useState(null);
  const [asked, setAsked] = useState(null);
  const [savingType, setSavingType] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/ipv/session");
      setSession(data);
      setLocation(data.location);
      setSaved(data.saved || {});
      setStartedAt(data.startedAt);
      setRemarks(data.remarks || "");
      if (data.status === "completed" || data.status === "cancelled") onClose(data.status);
      setOpen((current) => current || data.documents.find((d) => !data.saved?.[d.type])?.type || null);
    } catch (err) {
      setLoadError(errorMessage(err, "This video IPV link can't be opened."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  useEffect(() => {
    load();
    media.start("user");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const onEvent = useCallback((event, data) => {
    if (event === "location") setLocation((current) => ({ ...current, ...data, recordedAt: new Date().toISOString() }));
    if (event === "session:ended") {
      media.stop();
      onClose(data?.status || "cancelled");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const call = useIpvCall({ token, role: "rm", localStream: media.stream, active: Boolean(media.stream), onEvent });
  const connected = call.status === "connected";
  useEffect(() => {
    if (connected && !startedAt) setStartedAt(new Date().toISOString());
  }, [connected, startedAt]);
  const timer = useElapsed(startedAt);

  const askToShow = (doc) => {
    setAsked(doc.type);
    call.send("doc:request", { type: doc.type, label: doc.label, instruction: doc.instruction });
  };

  const saveFrame = async (doc) => {
    setError("");
    const image = grabFrame(remoteVideo.current);
    if (!image) {
      setError("The client's video isn't showing yet, so there's nothing to save.");
      return;
    }
    setSavingType(doc.type);
    try {
      const { data } = await api.post("/ipv/capture", { docType: doc.type, image });
      setSaved((s) => ({ ...s, [doc.type]: { capturedAt: data.capturedAt } }));
      setThumbs((t) => ({ ...t, [doc.type]: image }));
      setAsked(null);
      const next = session.documents.find((d) => d.type !== doc.type && !saved[d.type]);
      setOpen(next?.type || null);
    } catch (err) {
      setError(errorMessage(err, "This frame couldn't be saved. Please try again."));
    } finally {
      setSavingType(null);
    }
  };

  const finish = async (kind) => {
    if (kind === "cancel" && !window.confirm("End this video IPV without completing it? The client will need to start a new one.")) return;
    setBusy(true);
    setError("");
    try {
      await api.post(kind === "complete" ? "/ipv/complete" : "/ipv/cancel", { remarks });
      media.stop();
      onClose(kind === "complete" ? "completed" : "cancelled");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loadError || !session) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md space-y-3 text-center">
          {loadError ? <ErrorBanner message={loadError} /> : <p className="text-sm text-slate-500">Opening the video IPV…</p>}
          {loadError && <Button variant="outline" onClick={() => onClose(null)}>Close</Button>}
        </div>
      </div>
    );
  }

  const client = session.client || {};
  const docs = session.documents;
  const savedCount = docs.filter((d) => saved[d.type]).length;
  const allSaved = savedCount === docs.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <Header
        title={`Live verification: ${client.name || client.pan}`}
        subtitle={`${client.pan} · ${client.accountType} · Attempt #${session.id}`}
        right={(
          <div className="flex items-center gap-3">
            <span ref={timer} className="font-mono text-sm font-semibold text-slate-700">00:00</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-brand-blue"}`}>
              {STATUS_LABEL[call.status]}
            </span>
            <Button variant="outline" small onClick={() => { media.stop(); onClose(null); }} disabled={busy}>Leave call</Button>
            <Button variant="danger" small onClick={() => finish("cancel")} disabled={busy}>End IPV</Button>
          </div>
        )}
      />
      <main className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.75fr)] lg:p-6">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <VideoTile ref={remoteVideo} stream={call.remoteStream} label="Client video" className="aspect-video w-full object-contain" />
            <span className="absolute left-3 top-2 text-xs font-semibold text-white/80">Client</span>
            {!connected && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
                {call.status === "waiting" ? "Waiting for the client to join…" : STATUS_LABEL[call.status]}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-36 overflow-hidden rounded-xl bg-black">
              <VideoTile stream={media.stream} muted mirrored label="Your video" className="aspect-video w-full" />
              <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-white">You</span>
            </div>
            <Button variant="outline" small onClick={media.toggleMic}>{media.micOn ? "Mute" : "Unmute"}</Button>
            <Button variant="outline" small onClick={media.toggleCamera}>{media.cameraOn ? "Camera off" : "Camera on"}</Button>
            <span className="text-xs text-slate-500">{call.peerOnline ? "Client is online" : "Client is not on the call"}</span>
          </div>
          <ErrorBanner message={media.error || call.error} />
          {media.error && <Button variant="outline" small onClick={() => media.start("user")}>Try again</Button>}
          <LocationPanel location={location} />
        </div>

        <section className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Verification checklist</h2>
              <span className="text-xs text-slate-500">{savedCount}/{docs.length} saved</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${(savedCount / docs.length) * 100}%` }} />
            </div>
          </div>
          <ol className="flex-1 divide-y divide-slate-100">
            {docs.map((doc, i) => {
              const isOpen = open === doc.type;
              const isSaved = Boolean(saved[doc.type]);
              return (
                <li key={doc.type}>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : doc.type)}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${isSaved ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                      {isSaved ? "✓" : ""}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-900">{i + 1}. {doc.label}</span>
                    {isSaved && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Saved</span>}
                    <span className="text-slate-400">{isOpen ? "▴" : "▾"}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 px-4 pb-4 pl-12">
                      <p className="text-xs text-slate-500">{doc.instruction}</p>
                      {thumbs[doc.type] && <img src={thumbs[doc.type]} alt={`${doc.label} as saved`} className="max-h-40 rounded-lg border border-slate-200" />}
                      {isSaved && !thumbs[doc.type] && <p className="text-xs text-emerald-700">Saved {formatTime(saved[doc.type].capturedAt)}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" small onClick={() => askToShow(doc)} disabled={!connected}>
                          {asked === doc.type ? "Asked — ask again" : "Ask client to show"}
                        </Button>
                        <Button small onClick={() => saveFrame(doc)} disabled={!connected || savingType === doc.type}>
                          {savingType === doc.type ? "Saving…" : isSaved ? "Save again" : "Save frame"}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="space-y-3 border-t border-slate-100 p-4">
            <label className="block text-xs font-semibold text-slate-600" htmlFor="remarks">Remarks (optional)</label>
            <textarea
              id="remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              placeholder="Anything to note about this verification"
            />
            <ErrorBanner message={error} />
            <Button className="w-full" onClick={() => finish("complete")} disabled={busy || !allSaved || !location}>
              {busy ? "Completing…" : "Complete IPV"}
            </Button>
            {!allSaved && <p className="text-xs text-slate-500">Save all {docs.length} documents to complete the IPV.</p>}
            {allSaved && !location && <p className="text-xs text-slate-500">The client's location hasn't been recorded yet.</p>}
          </div>
        </section>

        <div className="space-y-4">
          <Panel title="Customer details">
            <Detail label="Name" value={client.name} />
            <Detail label="Date of birth" value={client.dob} />
            <Detail label="PAN" value={client.pan} />
            <Detail label="Indian address proof" value={client.indianProof} />
            <Detail label="Foreign ID" value={client.foreignId} />
            <Detail label="Country of residence" value={client.residence} />
            <Detail label="Citizenship" value={client.citizenship} />
            <Detail label="Overseas address" value={client.overseasAddress} />
            <Detail label="Phone" value={client.phone} />
          </Panel>
          <Panel title="Session">
            <Detail label="Requested" value={formatTime(session.requestedAt)} />
            <Detail label="Status" value={connected ? "Live" : STATUS_LABEL[call.status]} />
          </Panel>
        </div>
      </main>
    </div>
  );
}
