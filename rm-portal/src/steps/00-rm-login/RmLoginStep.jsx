import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/aionion-logo.png";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import OtpDigitInputs from "../../components/ui/OtpDigitInputs";
import api from "../../services/api";
import { setRmEmail, clearApplication } from "../../services/applicationState";

const OTP_TTL_SECONDS = 10 * 60;

function formatCountdown(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Gate in front of the RM wizard: the Relationship Manager proves ownership
// of their email via OTP (/api/rm-login), then starts a fresh client
// application at the Aadhaar check. Not wrapped in OnboardingShell -- no
// application exists yet.
export default function RmLoginStep() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [locked, setLocked] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!locked || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [locked, secondsLeft]);

  const sendCode = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/rm-login/send-otp", { email });
      setLocked(true);
      setOtp("");
      setSecondsLeft(OTP_TTL_SECONDS);
      setDevOtp(data.devOtp || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send verification code.");
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
      const { data } = await api.post("/rm-login/verify-otp", { email, otpCode: otp });
      clearApplication();
      setRmEmail(data.rmEmail || email);
      navigate("/account-type");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (locked) verifyCode();
    else sendCode();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Soft brand-color glow behind the card -- purely decorative. */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold tracking-wide text-pink-500">NRI ONBOARDING · RELATIONSHIP MANAGER</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">RM Login</h1>
        </div>

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" />

          <div className="p-8">
            <div className="flex justify-center">
              <img src={logo} alt="Aionion Capital" className="h-16" />
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm font-semibold text-slate-700">Sign in with your RM email</p>
              <p className="mt-1.5 text-sm text-slate-500">
                We'll send a one-time code to verify it's you. You'll then fill in the client's details and send them
                a link to complete payment, photo and signing.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="flex items-end gap-3">
                <Input
                  label="Email address"
                  required
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="flex-1"
                  value={email}
                  disabled={locked}
                  onChange={(e) => setEmail(e.target.value.toUpperCase())}
                />
                {locked && (
                  <button
                    type="button"
                    className="mb-2.5 text-sm font-semibold text-brand-blue"
                    onClick={() => {
                      setLocked(false);
                      setOtp("");
                      setDevOtp(null);
                    }}
                  >
                    Change
                  </button>
                )}
              </div>

              {locked && (
                <div className="space-y-3">
                  <p className="text-sm text-emerald-600">✓ Verification code sent successfully</p>
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
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full justify-center bg-brand-gradient" disabled={loading}>
                {loading ? "Please wait…" : locked ? "Verify & continue →" : "Send code"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
