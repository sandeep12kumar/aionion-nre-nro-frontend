import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import logo from "../../assets/aionion-logo.png";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import ClientIpvCall from "../../ipv/ClientIpvCall";
import { ipvApi } from "../../ipv/ipvApi";

const DOCUMENTS = [
  { type: "passport_front", label: "Passport (front)" },
  { type: "passport_back", label: "Passport (back)" },
  { type: "pan_card", label: "PAN card" },
  { type: "foreign_id", label: "Foreign ID proof" },
  { type: "signature", label: "Your signature on a white paper" },
  { type: "session_frame", label: "Live session photo" },
];

// The video IPV link emailed to the client (/ipv/:token) -- the first step of
// the account opening, before the RM fills in the details. The client joins
// the call here; the RM joins from rm-portal. Afterwards the RM continues, and
// the client gets a second email to review, pay and sign.
export default function IpvLinkPage() {
  const { token } = useParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ipvApi(token).get("/ipv/session")
      .then(({ data }) => setStatus(data.status))
      .catch((err) => setError(err.response?.data?.message || "Unable to open your video IPV right now. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const onEnded = useCallback((result) => {
    setInCall(false);
    setStatus(result);
  }, []);

  const open = status === "requested" || status === "live";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center border-b border-slate-100 bg-white px-4 py-3 lg:px-8 lg:py-4">
        <img src={logo} alt="Aionion Capital" className="h-9 lg:h-11" />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card className="p-8">
          <p className="text-xs font-semibold tracking-wide text-pink-500">VIDEO IPV</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Video verification with your RM</h2>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Opening your video IPV…</p>
          ) : error ? (
            <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error} Please ask your Relationship Manager to send a new link.
            </p>
          ) : status === "completed" ? (
            <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
              <p className="text-3xl text-emerald-500" aria-hidden="true">✓</p>
              <p className="mt-2 text-base font-bold text-slate-900">Your video verification is complete</p>
              <p className="mt-1 text-sm text-slate-600">
                Thank you. Your Relationship Manager will now fill in your account opening details. You'll then get
                an email with a link to review them, pay and sign.
              </p>
            </div>
          ) : status === "cancelled" ? (
            <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This video call ended before the verification was completed. Your Relationship Manager will send you a new
              link.
            </p>
          ) : open ? (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-slate-500">
                Your Relationship Manager will verify you on a short video call. Join when you're ready — your RM joins
                from their side.
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Please keep these originals with you</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {DOCUMENTS.map((d) => <li key={d.type}>{d.label}</li>)}
                </ul>
                <p className="mt-3">Use a phone or laptop with a camera and microphone, in a quiet, well-lit place.</p>
              </div>
              {inCall ? (
                <ClientIpvCall token={token} documents={DOCUMENTS} onEnded={onEnded} onClose={() => setInCall(false)} />
              ) : (
                <Button type="button" onClick={() => setInCall(true)}>
                  Join the video call
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
