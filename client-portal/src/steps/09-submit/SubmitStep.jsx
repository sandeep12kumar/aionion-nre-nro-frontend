import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { CheckCircleIcon } from "../../components/ui/icons";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";
import { prevStepPath } from "../stepsConfig";
import happyInvesting from "../../assets/happy-investing.png";

const REDIRECT_URL = "https://www.aionioncapital.com/";
const SUBMITTED_SECONDS = 10; // "Application submitted", then ...
const HAPPY_SECONDS = 10; // ... the Happy Investing card, then the website

// End of the E-sign step: reached after Live photo (clients without Aadhaar,
// whose signature the RM collected) or after Aadhaar e-signing. Submits the
// application straight away -- the server generates the application PDF
// (or uses the Aadhaar-signed one), assigns the client code and emails both
// -- and shows the confirmation for SUBMITTED_SECONDS, then the Happy
// Investing card for HAPPY_SECONDS, then sends the client to
// aionioncapital.com. An already-submitted application starts at the
// confirmation.
export default function SubmitStep() {
  const navigate = useNavigate();
  const panNumber = getPanNumber();

  const [identity, setIdentity] = useState(null);
  const [clientCode, setClientCode] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(true);
  const [error, setError] = useState("");
  const started = useRef(false);

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post(`/identity/${panNumber}/submit`);
      setIdentity(data.identity);
      setClientCode(data.clientCode);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!panNumber || started.current) return;
    started.current = true;
    api
      .get(`/identity/${panNumber}`)
      .then(({ data }) => {
        setIdentity(data.identity);
        if (data.identity?.status === "completed") {
          setSubmitted(true);
          setSubmitting(false);
          api.get(`/client-code/${panNumber}`).then(({ data: codeData }) => setClientCode(codeData.clientCode?.client_code || null));
        } else {
          submit();
        }
      })
      .catch(() => {
        setError("Could not load your application. Please refresh the page.");
        setSubmitting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panNumber]);

  // submitted -> (10s) happy -> (10s) redirect
  const [phase, setPhase] = useState("submitted");
  const [secondsLeft, setSecondsLeft] = useState(SUBMITTED_SECONDS);
  useEffect(() => {
    if (!submitted) return undefined;
    setSecondsLeft(phase === "submitted" ? SUBMITTED_SECONDS : HAPPY_SECONDS);
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const next = setTimeout(() => {
      if (phase === "submitted") setPhase("happy");
      else window.location.href = REDIRECT_URL;
    }, (phase === "submitted" ? SUBMITTED_SECONDS : HAPPY_SECONDS) * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(next);
    };
  }, [submitted, phase]);

  if (submitted && phase === "happy") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8">
        <img
          src={happyInvesting}
          alt="Happy Investing..! Congratulations! Your Demat Account Opening Process Has Been Completed Successfully. Your Demat Account will be activated within 2 working days. You will receive a confirmation notification once your account is active. Thank you for choosing us."
          className="w-full max-w-3xl"
        />
        <p className="mt-6 text-xs text-slate-400">
          Redirecting to aionioncapital.com in {secondsLeft}s…{" "}
          <a href={REDIRECT_URL} className="font-semibold text-brand-blue hover:underline">
            Go now
          </a>
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <OnboardingShell currentStepId="esign">
        <Card className="p-8 text-center">
          <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-500" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Application submitted</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Your NRI account opening application has been received by Aionion Capital and is now under review. Your
            client code and application PDF have been emailed to {identity?.email || "your registered email"}.
          </p>
          {clientCode && (
            <div className="mx-auto mt-6 max-w-xs rounded-xl bg-[var(--regime-color)] p-4 text-white">
              <p className="text-xs font-semibold tracking-wide opacity-80">YOUR CLIENT CODE</p>
              <p className="mt-1 text-2xl font-bold tracking-wide">{clientCode}</p>
            </div>
          )}
        </Card>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell currentStepId="esign">
      <Card className="p-8 text-center">
        {submitting ? (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Submitting your application…</h2>
            <p className="mt-2 text-sm text-slate-500">This takes a few seconds. Please don't close this page.</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Your application couldn't be submitted</h2>
            <p role="alert" className="mx-auto mt-3 max-w-md rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(prevStepPath("esign"))}>
                ← Back
              </Button>
              <Button onClick={submit}>Try again</Button>
            </div>
          </>
        )}
      </Card>
    </OnboardingShell>
  );
}
