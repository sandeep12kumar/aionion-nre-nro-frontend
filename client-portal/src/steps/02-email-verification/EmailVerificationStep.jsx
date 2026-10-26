import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import StepFooter from "../../components/layout/StepFooter";
import Card from "../../components/ui/Card";
import OtpDigitInputs from "./OtpDigitInputs";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";
import { nextStepPath, prevStepPath } from "../stepsConfig";

const OTP_TTL_SECONDS = 10 * 60;

function formatCountdown(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// One factor verification (after Review, before Payment): a code is sent to
// the email the RM entered on the Personal profile, and the client types it
// in. The email can't be changed here -- the RM corrects it in rm-portal.
export default function EmailVerificationStep() {
  const navigate = useNavigate();
  const panNumber = getPanNumber();

  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!panNumber) return;
    api
      .get(`/otp/${panNumber}/status`)
      .then(({ data }) => {
        setEmail(data.email || "");
        setVerified(Boolean(data.verified));
      })
      .catch(() => setError("Could not load your email address. Please refresh the page."))
      .finally(() => setStatusLoaded(true));
  }, [panNumber]);

  useEffect(() => {
    if (!sent || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [sent, secondsLeft]);

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/otp/send", { panNumber });
      setSent(true);
      setOtp("");
      setSecondsLeft(OTP_TTL_SECONDS);
      setDevOtp(data.devOtp || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send the verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/otp/verify", { panNumber, otpCode: otp });
      navigate(nextStepPath("verify_email"));
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (verified) navigate(nextStepPath("verify_email"));
    else if (sent) verifyCode();
    else sendCode();
  };

  return (
    <OnboardingShell currentStepId="verify_email">
      <Card className="p-8">
        <p className="text-xs font-semibold tracking-wide text-pink-500">ONE FACTOR VERIFICATION</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Verify your email address</h2>
        <p className="mt-1 text-sm text-slate-500">
          We'll send a one-time code to the email your Relationship Manager entered. It's used for application
          updates and regulatory communication.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Email address</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
              {email || (statusLoaded ? "—" : "Loading…")}
            </p>
            {!verified && (
              <p className="mt-1.5 text-xs text-slate-400">
                Not your email? Contact your Relationship Manager to correct it before you continue.
              </p>
            )}
          </div>

          {verified ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Your email address is verified.</p>
          ) : (
            sent && (
              <div className="space-y-3">
                <p className="text-sm text-emerald-600">✓ Verification code sent to your email</p>
                {devOtp && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Dev mode (no SMTP configured) — your code is <strong>{devOtp}</strong>
                  </p>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Enter the 6-digit code *</label>
                  <OtpDigitInputs value={otp} onChange={setOtp} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{secondsLeft > 0 ? `Code valid for ${formatCountdown(secondsLeft)}` : "Code expired"}</span>
                  <button type="button" className="font-semibold text-brand-blue" onClick={sendCode} disabled={loading}>
                    Resend code
                  </button>
                </div>
              </div>
            )
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter
            onBack={() => navigate(prevStepPath("verify_email"))}
            submitLabel={verified ? "Continue" : sent ? "Verify & continue" : "Send code"}
            loading={loading}
            disabled={!statusLoaded || !email}
          />
        </form>
      </Card>
    </OnboardingShell>
  );
}
