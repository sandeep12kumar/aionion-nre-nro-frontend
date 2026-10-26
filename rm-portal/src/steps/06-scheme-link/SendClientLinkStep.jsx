import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { CheckCircleIcon } from "../../components/ui/icons";
import api from "../../services/api";
import { getPanNumber, getHasAadhaar, getBasePath, clearApplication } from "../../services/applicationState";

const SCHEME_LABELS = { lifeTime: "Life Time Advantage", annualCare: "Annual Care" };

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

// Last RM screen: one button generates the client-portal link and emails
// it to the client's verified email (POST /client-link/:pan/send). The
// client then continues with Review, Payment, Live photo, E-sign and PDF.
export default function SendClientLinkStep({ onBack }) {
  const navigate = useNavigate();
  const panNumber = getPanNumber();
  const hasAadhaar = getHasAadhaar();

  const [identity, setIdentity] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [scheme, setScheme] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!panNumber) return;
    Promise.all([
      api.get(`/identity/${panNumber}`),
      api.get(`/personal-details/${panNumber}`),
      api.get(`/scheme/${panNumber}`),
    ]).then(([identityRes, personalRes, schemeRes]) => {
      setIdentity(identityRes.data.identity);
      setPersonal(personalRes.data.personalDetails);
      setScheme(schemeRes.data.scheme);
    });
  }, [panNumber]);

  const sendLink = async () => {
    setError("");
    setCopied(false);
    setLoading(true);
    try {
      const { data } = await api.post(`/client-link/${panNumber}/send`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send the client link.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const startNew = () => {
    clearApplication();
    navigate(`${getBasePath()}/aadhaar`);
  };

  return (
    <Card className="p-8">
      <div>
        <p className="text-xs font-semibold tracking-wide text-pink-500">HAND OVER TO CLIENT</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Send link to client</h2>
        <p className="mt-1 text-sm text-slate-500">
          The client will open this link to review their details, pay, take a live photo
          {hasAadhaar ? ", e-sign with Aadhaar" : ""} and submit the application.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div className="rounded-xl border border-slate-100 p-4">
          <SummaryRow label="Client name" value={personal?.full_name || identity?.full_name} />
          <SummaryRow label="PAN" value={identity?.pan_number} />
          <SummaryRow label="Registered email" value={identity?.email} />
          <SummaryRow label="Scheme" value={scheme ? `${SCHEME_LABELS[scheme.scheme_key] || scheme.scheme_key} · ₹${scheme.total_amount}` : null} />
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-slate-400">Signing</span>
            <Badge tone="regime">{hasAadhaar ? "Aadhaar e-sign by client" : "Signature collected by RM"}</Badge>
          </div>
        </div>

        {result ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
            <p className="mt-3 text-base font-bold text-slate-900">
              {result.emailed ? "Link sent to the client" : "Link generated"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {result.emailed
                ? `We've emailed the link to ${result.email}. It's valid for 7 days.`
                : `Email couldn't be sent (SMTP not configured) — copy the link below and share it with ${result.email}.`}
            </p>
            <div className="mx-auto mt-4 flex max-w-xl items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-left text-xs text-slate-600">{result.link}</span>
              <button type="button" className="text-xs font-semibold text-brand-blue" onClick={copyLink}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" className="justify-center" onClick={sendLink} disabled={loading}>
                {loading ? "Please wait…" : "Resend link"}
              </Button>
              <Button className="justify-center" onClick={startNew}>
                Start a new application →
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" className="justify-center" onClick={onBack}>
              ← Back
            </Button>
            <Button type="button" className="justify-center" onClick={sendLink} disabled={loading || !identity?.email}>
              {loading ? "Please wait…" : "Generate & send link to client →"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Card>
  );
}
