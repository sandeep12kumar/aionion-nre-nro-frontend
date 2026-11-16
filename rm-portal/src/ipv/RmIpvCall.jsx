import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ErrorBanner, Header, VideoTile, formatTime, useElapsed } from "./ipvUi";
import { useLocalMedia } from "./useLocalMedia";
import { STATUS_LABEL, useIpvCall } from "./useIpvCall";
import { errorMessage, ipvApi } from "./ipvApi";
import DocumentDetailsEditor from "./DocumentDetailsEditor";
import { useCallRecorder } from "./useCallRecorder";

// Video frames vary in sharpness (focus hunting, the card moving, compression),
// so for a document a few frames are taken over about a second and the
// sharpest kept -- judged by the variance of the Laplacian (edge contrast).
function sharpness(canvas) {
  const w = Math.min(480, canvas.width);
  const h = Math.round((canvas.height / canvas.width) * w);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  return n ? sumSq / n - (sum / n) ** 2 : 0;
}

async function grabSharpestFrame(video, tries = 6, gapMs = 180) {
  if (!video?.videoWidth) return null;
  let best = null;
  for (let i = 0; i < tries; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const score = sharpness(canvas);
    if (!best || score > best.score) best = { canvas, score };
    if (i < tries - 1) await sleep(gapMs);
  }
  return best.canvas.toDataURL("image/jpeg", 0.92);
}

const MAX_SCREENSHOT_WIDTH = 1920;
const DETAIL_LABELS = {
  passport_front: { number: "Passport number", name: "Passport name", date: "Passport expiry date" },
  pan_card: { number: "PAN number", name: "PAN card name", date: "PAN card date of birth" },
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The live session photo: a screenshot of the RM's own call screen (client
// video, RM video, checklist, client details and location together), taken
// with the browser's screen capture -- it asks the RM to share this tab.
// Returns null when the RM declines or the browser can't capture the screen.
async function grabScreen() {
  if (!navigator.mediaDevices?.getDisplayMedia) return null;
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser", frameRate: 5 },
      audio: false,
      preferCurrentTab: true, // Chrome / Edge: offer this tab first
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
    });
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await sleep(500); // let the first frames arrive (and the picker close)
    if (!video.videoWidth) return null;
    const scale = Math.min(1, MAX_SCREENSHOT_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

// Fallback live session photo: the client's and the RM's video side by side,
// with the time.
async function composeSession(remoteVideo, localStream) {
  if (!remoteVideo?.videoWidth) return null;
  const own = document.createElement("video");
  own.muted = true;
  own.playsInline = true;
  own.srcObject = localStream || null;
  await own.play().catch(() => {});
  await sleep(200);
  const height = 540;
  const clientWidth = Math.round((remoteVideo.videoWidth / remoteVideo.videoHeight) * height);
  const rmWidth = own.videoWidth ? Math.round((own.videoWidth / own.videoHeight) * height) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = clientWidth + rmWidth;
  canvas.height = height + 40;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(remoteVideo, 0, 0, clientWidth, height);
  if (rmWidth) ctx.drawImage(own, clientWidth, 0, rmWidth, height);
  own.srcObject = null;
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Client  |  RM  |  ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`, 12, height + 26);
  return canvas.toDataURL("image/jpeg", 0.88);
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
  const [documentDetails, setDocumentDetails] = useState({});
  const [ocrWarnings, setOcrWarnings] = useState({});
  const [editingDetails, setEditingDetails] = useState({});
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
      setDocumentDetails(data.documentDetails || {});
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
      recorderRef.current?.stop();
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

  // The call is recorded from the moment the client's video connects until
  // the RM completes, ends or leaves the IPV (client/IPV/live_video).
  const recorder = useCallRecorder({ api, remoteVideo, remoteStream: call.remoteStream, localStream: media.stream });
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const recordingStarted = useRef(false);
  useEffect(() => {
    if (connected && !recordingStarted.current) {
      recordingStarted.current = true;
      recorder.start();
    }
  }, [connected, recorder]);
  const leave = async () => {
    setBusy(true);
    await recorder.stop();
    media.stop();
    onClose(null);
  };
  const timer = useElapsed(startedAt);

  const askToShow = (doc) => {
    setAsked(doc.type);
    call.send("doc:request", { type: doc.type, label: doc.label, instruction: doc.instruction });
  };

  const saveFrame = async (doc) => {
    setError("");
    // the live session photo is the RM's whole call screen; documents are the client's video
    const image = doc.type === "session_frame"
      ? (await grabScreen()) || (await composeSession(remoteVideo.current, media.stream))
      : await grabSharpestFrame(remoteVideo.current);
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
      if (doc.type === "passport_front" || doc.type === "pan_card") {
        setOpen(doc.type);
        setDocumentDetails(current => ({ ...current, [doc.type]: { number: "", name: "", date: "" } }));
        setOcrWarnings(current => ({ ...current, [doc.type]: null }));
        try {
          const result = await api.post("/ipv/document-ocr", { docType: doc.type });
          setDocumentDetails(current => ({ ...current, [doc.type]: result.data.details }));
          setOcrWarnings(current => ({ ...current, [doc.type]: result.data.warning }));
        } catch (err) {
          setOcrWarnings(current => ({ ...current, [doc.type]: errorMessage(err, "Image saved. OCR failed; use Edit values to enter the details.") }));
        }
      } else {
        const next = session.documents.find((d) => d.type !== doc.type && !saved[d.type]);
        setOpen(next?.type || null);
      }
    } catch (err) {
      setError(errorMessage(err, "This frame couldn't be saved. Please try again."));
    } finally {
      setSavingType(null);
    }
  };

  const saveDetails = async (type, values) => {
    setError("");
    try {
      const { data } = await api.patch("/ipv/document-details", { docType: type, details: values });
      setDocumentDetails(current => ({ ...current, [type]: data.details }));
      setOcrWarnings(current => ({ ...current, [type]: null }));
      return true;
    } catch (err) {
      setError(errorMessage(err, "Unable to save edited values."));
      return false;
    }
  };

  const finish = async (kind) => {
    if (kind === "cancel" && !window.confirm("End this video IPV without completing it? The client will need to start a new one.")) return;
    setBusy(true);
    setError("");
    try {
      // the recording is saved first, so the report records it
      await recorder.stop();
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
  // the passport and PAN card details are required: typed in (Edit values) where the OCR missed them
  const missingDetails = Object.entries(DETAIL_LABELS).flatMap(([type, labels]) =>
    Object.entries(labels).filter(([key]) => !String(documentDetails[type]?.[key] || "").trim()).map(([, label]) => label));
  const detailsMissingFor = (type) => Boolean(saved[type]) && Object.keys(DETAIL_LABELS[type] || {}).some((key) => !String(documentDetails[type]?.[key] || "").trim());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <Header
        title={`Live verification: ${client.name || client.pan}`}
        subtitle={`${client.pan} · ${client.accountType} · Attempt #${session.id}`}
        right={(
          <div className="flex items-center gap-3">
            <span ref={timer} className="font-mono text-sm font-semibold text-slate-700">00:00</span>
            {recorder.recording && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Recording
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-brand-blue"}`}>
              {STATUS_LABEL[call.status]}
            </span>
            <Button variant="outline" small onClick={leave} disabled={busy}>Leave call</Button>
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
          <ErrorBanner message={media.error || call.error || recorder.error} />
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
                    {isSaved && detailsMissingFor(doc.type) && savingType !== doc.type
                      ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Details missing</span>
                      : isSaved && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Saved</span>}
                    <span className="text-slate-400">{isOpen ? "▴" : "▾"}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 px-4 pb-4 pl-12">
                      <p className="text-xs text-slate-500">{doc.instruction}</p>
                      {isSaved && (doc.type === "passport_front" || doc.type === "pan_card") && (
                        <DocumentDetailsEditor type={doc.type} value={documentDetails[doc.type]} reading={savingType === doc.type}
                          warning={ocrWarnings[doc.type]} onSave={(values) => saveDetails(doc.type, values)}
                          onEditing={(editing) => setEditingDetails(current => ({ ...current, [doc.type]: editing }))} />
                      )}
                      {thumbs[doc.type] && <img src={thumbs[doc.type]} alt={`${doc.label} as saved`} className="max-h-40 rounded-lg border border-slate-200" />}
                      {isSaved && !thumbs[doc.type] && <p className="text-xs text-emerald-700">Saved {formatTime(saved[doc.type].capturedAt)}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" small onClick={() => askToShow(doc)} disabled={!connected}>
                          {asked === doc.type ? "Asked — ask again" : "Ask client to show"}
                        </Button>
                        <Button small onClick={() => saveFrame(doc)} disabled={!connected || Boolean(savingType) || Object.values(editingDetails).some(Boolean)}>
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
            <Button className="w-full" onClick={() => finish("complete")} disabled={busy || !allSaved || !location || missingDetails.length > 0 || Boolean(savingType) || Object.values(editingDetails).some(Boolean)}>
              {busy ? "Completing…" : "Complete IPV"}
            </Button>
            {Object.values(editingDetails).some(Boolean) && <p className="text-xs text-amber-700">Save or cancel the edited OCR values before completing IPV.</p>}
            {!allSaved && <p className="text-xs text-slate-500">Save all {docs.length} documents to complete the IPV.</p>}
            {allSaved && !savingType && missingDetails.length > 0 && (
              <p className="text-xs text-amber-700">
                The OCR couldn't read: {missingDetails.join(", ")}. Open the passport / PAN card above and use <b>Edit values</b> to fill them in.
              </p>
            )}
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
