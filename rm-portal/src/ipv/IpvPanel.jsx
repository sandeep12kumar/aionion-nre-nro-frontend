import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import RmIpvCall from "./RmIpvCall";
import { errorMessage, ipvApi } from "./ipvApi";

const POLL_MS = 5000;

// The video IPV on rm-portal's last page (after the client link is sent):
// once the client has paid, taken the live photo and clicked "Start IPV" in
// client-portal, this shows they're ready and the RM joins the call from
// here. Hidden while the server's IPV_ENABLED switch is off.
// onStatus(info) -- { enabled, status }, so the page knows when the RM may
// move on to a new application (once the IPV is completed).
export default function IpvPanel({ panNumber, onStatus }) {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inCall = useRef(false);
  inCall.current = Boolean(token);

  const refresh = useCallback(async () => {
    if (!panNumber || inCall.current) return;
    try {
      const { data } = await api.get(`/ipv/rm/${panNumber}`);
      setInfo(data);
    } catch {
      /* keep the last state; the next check retries. Never answered at all
         (e.g. a backend without the IPV): treat the IPV as switched off. */
      setInfo((current) => current || { enabled: false });
    }
  }, [panNumber]);

  useEffect(() => {
    if (info) onStatus?.(info);
  }, [info, onStatus]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const join = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await api.post(`/ipv/rm/${panNumber}/token`);
      setToken(data.token);
    } catch (err) {
      setError(errorMessage(err, "Unable to open the video IPV right now."));
    } finally {
      setBusy(false);
    }
  };

  const onClose = useCallback((status) => {
    setToken(null);
    if (status === "completed") setNotice("Video IPV completed. The report has been saved.");
    else if (status === "cancelled") setNotice("The video IPV was ended without completing it. The client can start it again.");
    setInfo((current) => (status && current ? { ...current, status } : current));
    setTimeout(refresh, 300);
  }, [refresh]);

  const downloadReport = async () => {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post(`/ipv/rm/${panNumber}/token`);
      const { data: pdf } = await ipvApi(data.token).get("/ipv/report", { responseType: "blob" });
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IPV_${panNumber}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(errorMessage(err, "The report couldn't be downloaded."));
    } finally {
      setBusy(false);
    }
  };

  // S3: the backend answers with a signed link; locally with the file itself
  const downloadRecording = async (segment) => {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post(`/ipv/rm/${panNumber}/token`);
      const { data: body } = await ipvApi(data.token).get("/ipv/recording", { params: { segment }, responseType: "blob" });
      const a = document.createElement("a");
      if (body.type.includes("json")) {
        const { url, fileName } = JSON.parse(await body.text());
        a.href = url;
        a.download = fileName;
      } else {
        a.href = URL.createObjectURL(body);
        a.download = `IPV_${panNumber}${segment > 1 ? `_part${segment}` : ""}.${body.type.includes("mp4") ? "mp4" : "webm"}`;
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      }
      a.click();
    } catch (err) {
      let message = null;
      try {
        if (err.response?.data instanceof Blob) message = JSON.parse(await err.response.data.text()).message;
      } catch {
        /* not a JSON error */
      }
      setError(message || errorMessage(err, "The recording couldn't be downloaded."));
    } finally {
      setBusy(false);
    }
  };

  if (!info?.enabled) return null;
  const status = info.status;
  const open = status === "requested" || status === "live";

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
      <p className="text-xs font-semibold tracking-wide text-pink-500">VIDEO IPV</p>
      {status === "completed" ? (
        <>
          <p className="mt-1 text-base font-bold text-slate-900">✓ Video IPV completed</p>
          <p className="mt-1 text-sm text-slate-600">The client can now sign and submit the application.</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" className="text-sm font-semibold text-brand-blue disabled:opacity-50" disabled={busy} onClick={downloadReport}>
              Download IPV report (PDF)
            </button>
            {Array.from({ length: info.recordings || 0 }, (_, i) => (
              <button key={i} type="button" className="text-sm font-semibold text-brand-blue disabled:opacity-50" disabled={busy} onClick={() => downloadRecording(i + 1)}>
                Download call recording{info.recordings > 1 ? ` (part ${i + 1})` : ""}
              </button>
            ))}
            {!info.recordings && <span className="text-sm text-slate-400">No call recording</span>}
          </div>
        </>
      ) : open ? (
        <>
          <p className="mt-1 text-base font-bold text-slate-900">
            {info.clientOnline ? "Your client is ready for the video IPV" : "Your client has started the video IPV"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {info.clientOnline
              ? "Join the call, ask the client to show each document and save a frame of it."
              : "They're not on the call right now — you can join and wait for them."}
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            disabled={busy}
            onClick={join}
          >
            {busy ? "Opening…" : "Join video IPV"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-base font-bold text-slate-900">Waiting for the client</p>
          <p className="mt-1 text-sm text-slate-600">
            After payment and the live photo, the client clicks <b>Start IPV</b>. Keep this page open — you'll be able to
            join the video call here.
          </p>
        </>
      )}
      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {token && <RmIpvCall token={token} onClose={onClose} />}
    </div>
  );
}
