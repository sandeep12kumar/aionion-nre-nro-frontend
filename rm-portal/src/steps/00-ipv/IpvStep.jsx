import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { CheckCircleIcon } from "../../components/ui/icons";
import api from "../../services/api";
import RmIpvCall from "../../ipv/RmIpvCall";
import { errorMessage, ipvApi } from "../../ipv/ipvApi";
import { downloadIpvRecording, downloadIpvReport } from "../../ipv/ipvDownloads";
import { getIpv, setIpv, getRmEmail, clearApplication } from "../../services/applicationState";

const POLL_MS = 4000;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// The RM's first step for each client (/ipv): the RM enters the client's
// email and the client gets the video IPV link by email (POST /ipv/start).
// The client opens it in client-portal; the RM joins the call from here.
// Once the IPV is completed the RM continues with the account opening
// details (Account type -> ...). Skipped while the server's IPV switch is off.
export default function IpvStep() {
  const navigate = useNavigate();
  const [ipv, setIpvState] = useState(getIpv());
  const [enabled, setEnabled] = useState(null);
  const [email, setEmail] = useState(getIpv()?.email || "");
  const [session, setSession] = useState(null);
  const [link, setLink] = useState(null); // shown only when the email couldn't be sent
  const [inCall, setInCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const callOpen = useRef(false);
  callOpen.current = inCall;

  const update = useCallback((values) => {
    setIpv(values);
    setIpvState(getIpv());
  }, []);

  // is the IPV switched on?
  useEffect(() => {
    api.get("/ipv/config")
      .then(({ data }) => setEnabled(data.enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (enabled === false) {
      update({ skipped: true });
      navigate("/account-type", { replace: true });
    }
  }, [enabled, navigate, update]);

  const token = ipv?.token;
  const refresh = useCallback(async () => {
    if (!token || callOpen.current) return;
    try {
      const { data } = await ipvApi(token).get("/ipv/session");
      setSession(data);
      // the status, and what the IPV read from the PAN card (prefills Identity)
      update({
        status: data.status,
        ocrPan: data.documentDetails?.pan_card?.number || null,
        ocrName: data.documentDetails?.pan_card?.name || data.documentDetails?.passport_front?.name || null,
        ocrDob: data.documentDetails?.pan_card?.date || null,
      });
    } catch (err) {
      if ([404, 410].includes(err.response?.status)) {
        setError(errorMessage(err));
        update({ token: null, status: null });
        setSession(null);
      }
    }
  }, [token, update]);

  useEffect(() => {
    if (!token) return undefined;
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [token, refresh]);

  const sendLink = async (e) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    const clientEmail = email.trim().toUpperCase();
    if (!EMAIL_PATTERN.test(clientEmail)) {
      setError("Enter the client's email address.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/ipv/start", { clientEmail, rmEmail: getRmEmail() });
      update({ token: data.token, id: data.id, email: clientEmail, status: "requested", ocrPan: null, ocrName: null, ocrDob: null, skipped: false });
      setLink(data.clientLink || null);
      setSession(null);
      setNotice(data.emailed ? `The video IPV link has been emailed to ${clientEmail}.` : "");
    } catch (err) {
      setError(errorMessage(err, "Unable to send the video IPV link right now."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await ipvApi(token).post("/ipv/resend");
      setLink(data.clientLink || null);
      setNotice(data.emailed ? `A new link has been emailed to ${ipv.email}. The earlier link no longer works.` : "");
    } catch (err) {
      setError(errorMessage(err, "Unable to send the video IPV link right now."));
    } finally {
      setBusy(false);
    }
  };

  // a different client / email: starts over (the earlier link stays unused)
  const changeEmail = () => {
    clearApplication();
    setIpvState(null);
    setSession(null);
    setLink(null);
    setNotice("");
    setError("");
  };

  const onClose = useCallback((status) => {
    setInCall(false);
    if (status === "completed") setNotice("Video IPV completed. The report has been saved.");
    else if (status === "cancelled") setNotice("");
    if (status) update({ status });
    setTimeout(refresh, 300);
  }, [refresh, update]);

  const download = async (job, fallback) => {
    setError("");
    setBusy(true);
    try {
      await job();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };
  const fileStem = session?.linkedPan || `IPV-${ipv?.id}`;

  if (enabled !== true) {
    return (
      <OnboardingShell currentStepId="ipv">
        <Card className="p-8 text-sm text-slate-500">Loading…</Card>
      </OnboardingShell>
    );
  }

  const status = ipv?.token ? ipv.status : null;
  const completed = status === "completed";
  const open = status === "requested" || status === "live";

  return (
    <OnboardingShell currentStepId="ipv">
      <Card className="p-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">FIRST STEP</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Video IPV</h2>
          <p className="mt-1 text-sm text-slate-500">
            Verify the client on a video call before filling in their account opening details. They'll get the link by
            email and join from their phone or laptop.
          </p>
        </div>

        {!status || status === "cancelled" ? (
          <form onSubmit={sendLink} className="mt-8 space-y-5">
            {status === "cancelled" && (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                The last video IPV was ended without completing it. Send a new link to try again.
              </p>
            )}
            <Input
              label="Client's email address"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              helperText="The video IPV link is sent here. Use the email the client will verify for the account."
            />
            <div className="flex justify-end border-t border-slate-100 pt-6">
              <Button type="submit" className="justify-center" disabled={busy}>
                {busy ? "Please wait…" : "Send video IPV link →"}
              </Button>
            </div>
          </form>
        ) : completed ? (
          <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
            <p className="mt-3 text-base font-bold text-slate-900">Video IPV completed</p>
            <p className="mt-1 text-sm text-slate-500">
              {session?.client?.name ? `${session.client.name} · ` : ""}{ipv.email}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
              <button type="button" className="text-sm font-semibold text-brand-blue disabled:opacity-50" disabled={busy}
                onClick={() => download(() => downloadIpvReport(token, fileStem), "The report couldn't be downloaded.")}>
                Download IPV report (PDF)
              </button>
              {Array.from({ length: session?.recordings || 0 }, (_, i) => (
                <button key={i} type="button" className="text-sm font-semibold text-brand-blue disabled:opacity-50" disabled={busy}
                  onClick={() => download(() => downloadIpvRecording(token, fileStem, i + 1), "The recording couldn't be downloaded.")}>
                  Download call recording{session.recordings > 1 ? ` (part ${i + 1})` : ""}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button className="justify-center" onClick={() => navigate("/account-type")}>
                Continue to account opening →
              </Button>
            </div>
          </div>
        ) : open ? (
          <div className="mt-8 space-y-5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
              <p className="text-xs font-semibold tracking-wide text-pink-500">LINK SENT TO {ipv.email}</p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {session?.clientOnline ? "Your client is ready for the video IPV" : "Waiting for the client to open the link"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {session?.clientOnline
                  ? "Join the call, ask the client to show each document and save a frame of it."
                  : "You can join the call now and wait for them there."}
              </p>
              {link && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500">Email couldn't be sent (SMTP not configured) — share this link with the client:</p>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{link}</span>
                    <button type="button" className="text-xs font-semibold text-brand-blue" onClick={() => navigator.clipboard?.writeText(link)}>
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button className="justify-center" onClick={() => setInCall(true)} disabled={busy}>
                  Join video IPV
                </Button>
                <Button variant="outline" className="justify-center" onClick={resend} disabled={busy}>
                  {busy ? "Please wait…" : "Resend link"}
                </Button>
                <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-700" onClick={changeEmail}>
                  Use a different email
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {notice && <p className="mt-4 text-sm text-emerald-700">{notice}</p>}
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </Card>
      {inCall && token && <RmIpvCall token={token} onClose={onClose} />}
    </OnboardingShell>
  );
}
