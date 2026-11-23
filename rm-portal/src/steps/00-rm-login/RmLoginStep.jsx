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
      navigate("/ipv");
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
    <div className="app-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft brand-color glow behind the card -- purely decorative. */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-brand-pink/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-lift lg:grid-cols-[1.05fr_1fr]">
        {/* brand panel (desktop) */}
        <div className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-brand-navy p-10 text-white lg:flex">
          <div aria-hidden="true" className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-blue opacity-60 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-pink opacity-50 blur-3xl" />
          <div className="relative">
            <span className="inline-flex rounded-2xl bg-white px-4 py-2.5 shadow-lg">
              <img src={logo} alt="Aionion Capital" className="h-11" />
            </span>
          </div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">NRI onboarding</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">
              Open NRE &amp; NRO accounts for your clients — <span className="text-brand-pink">end to end.</span>
            </h2>
            <ul className="mt-8 space-y-4 text-sm text-white/85">
              {[
                ["Video IPV", "Verify the client face to face, wherever they are"],
                ["Guided steps", "PAN, DigiLocker, bank proofs, nominees and scheme"],
                ["One link", "The client reviews, pays, takes a live photo and signs"],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">✓</span>
                  <span>
                    <span className="font-semibold text-white">{title}</span>
                    <span className="block text-white/65">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs tracking-[0.25em] text-white/50">RESEARCH | TRUST | FOREVER</p>
        </div>

        <Card className="overflow-hidden rounded-none border-0 shadow-none">
          <div className="h-1.5 bg-brand-gradient lg:hidden" />

          <div className="p-8 sm:p-10">
            <div className="text-center lg:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-pink">Relationship Manager</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">RM Login</h1>
            </div>
            <div className="mt-6 flex justify-center lg:hidden">
              <img src={logo} alt="Aionion Capital" className="h-14" />
            </div>

            <div className="mt-5 text-center lg:text-left">
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

              <Button type="submit" className="w-full justify-center bg-brand-gradient py-3" disabled={loading}>
                {loading ? "Please wait…" : locked ? "Verify & continue →" : "Send code"}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-slate-400 lg:text-left">🔒 The code is valid for 10 minutes and works only once.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
