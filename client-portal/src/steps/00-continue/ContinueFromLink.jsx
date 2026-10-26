import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "../../assets/aionion-logo.png";
import Card from "../../components/ui/Card";
import api from "../../services/api";
import { setClientSession, resumeStepPath, clearSession } from "../../services/applicationState";

// Landing page for the link the RM emailed (/continue/:token). Resolves the
// token server-side, stores the client's session, and routes to wherever
// they left off (Review on first open). Without a token ("/"), it simply
// tells the client to open the link from their email.
export default function ContinueFromLink() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(
    token ? "" : "Please open the link your Relationship Manager sent to your registered email to continue your application.",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get(`/client-link/resolve/${token}`)
      .then(({ data }) => {
        if (cancelled) return;
        setClientSession({ token, panNumber: data.panNumber, accountType: data.accountType, hasAadhaar: data.hasAadhaar });
        navigate(resumeStepPath(data), { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        clearSession();
        setError(err.response?.data?.message || "We couldn't open this link. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-pink-500">NRI ONBOARDING</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">Complete your NRI account opening</h1>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" />
          <div className="p-8 text-center">
            <div className="flex justify-center">
              <img src={logo} alt="Aionion Capital" className="h-16" />
            </div>
            {error ? (
              <p className="mt-6 text-sm text-slate-600">{error}</p>
            ) : (
              <p className="mt-6 text-sm text-slate-500">Opening your application…</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
