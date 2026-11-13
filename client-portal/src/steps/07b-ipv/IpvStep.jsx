import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import api from "../../services/api";
import { getLinkToken } from "../../services/applicationState";
import ClientIpvCall from "../../ipv/ClientIpvCall";
import { nextStepPath, prevStepPath } from "../stepsConfig";

const DOCUMENTS = [
  { type: "passport_front", label: "Passport (front)" },
  { type: "passport_back", label: "Passport (back)" },
  { type: "pan_card", label: "PAN card" },
  { type: "foreign_id", label: "Foreign ID proof" },
  { type: "signature", label: "Your signature on a white paper" },
];

// Video IPV, after the live photo and before e-sign. "Start IPV" opens the
// video call right here; the client's RM, on the last page of rm-portal,
// sees that the client is ready and joins. Once the RM completes the IPV,
// the client moves on to e-sign (or submit).
export default function IpvStep() {
  const navigate = useNavigate();
  const linkToken = getLinkToken();
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const next = useCallback(() => navigate(nextStepPath("ipv"), { replace: true }), [navigate]);

  useEffect(() => {
    api.get("/ipv/status", { params: { linkToken } })
      .then(({ data }) => {
        if (!data.required || data.status === "completed") next();
        else setStatus(data.status);
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to check your video IPV right now."))
      .finally(() => setLoading(false));
  }, [linkToken, next]);

  const start = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await api.post("/ipv/request", { linkToken });
      if (data.status === "completed") next();
      else setToken(data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to start the video IPV right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onEnded = useCallback((result) => {
    setToken(null);
    if (result === "completed") {
      next();
      return;
    }
    setStatus("cancelled");
    setNotice("Your video call was ended before it was completed. Click Start IPV to begin again.");
  }, [next]);

  const open = status === "requested" || status === "live";

  return (
    <OnboardingShell currentStepId="ipv">
      <Card className="p-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">VIDEO IPV</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Video verification with your RM</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your Relationship Manager will verify you on a short video call. Start it when you're ready — your RM joins
            from their side.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Please keep these originals with you</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {DOCUMENTS.map((d) => <li key={d.type}>{d.label}</li>)}
            </ul>
            <p className="mt-3">Use a phone or laptop with a camera and microphone, in a quiet, well-lit place.</p>
          </div>

          {token ? (
            <ClientIpvCall token={token} documents={DOCUMENTS} onEnded={onEnded} onClose={() => setToken(null)} />
          ) : loading ? (
            <p className="text-sm text-slate-500">Checking your video IPV…</p>
          ) : (
            <Button type="button" onClick={start} disabled={busy}>
              {busy ? "Please wait…" : open ? "Rejoin the video call" : "Start IPV"}
            </Button>
          )}
          {notice && <p className="text-sm text-amber-700">{notice}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!token && (
            <div className="flex border-t border-slate-100 pt-6">
              <Button type="button" variant="outline" onClick={() => navigate(prevStepPath("ipv"))}>
                ← Back
              </Button>
            </div>
          )}
        </div>
      </Card>
    </OnboardingShell>
  );
}
