import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import RequireLogin from "./components/layout/RequireLogin";
import { applyRegimeTheme } from "./services/applicationState";
import ContinueFromLink from "./steps/00-continue/ContinueFromLink";
import ReviewStep from "./steps/01-review/ReviewStep";
import EmailVerificationStep from "./steps/02-email-verification/EmailVerificationStep";
import PaymentStep from "./steps/06-scheme-payment/PaymentStep";
import PaymentCompleteStep from "./steps/06-scheme-payment/PaymentCompleteStep";
import PaymentFailedStep from "./steps/06-scheme-payment/PaymentFailedStep";
import LivePhotoStep from "./steps/07-live-photo/LivePhotoStep";
import EsignStep from "./steps/08-esign/EsignStep";
import SubmitStep from "./steps/09-submit/SubmitStep";

// client-portal: the client's half of the NRI onboarding, opened from the
// link their Relationship Manager emailed (/continue/:token).
//   Review -> One factor verification (email OTP) -> Payment -> Live photo ->
//   E-sign (Aadhaar holders sign with Aadhaar OTP; the application is then
//   submitted automatically and the confirmation shown).
// Everything before that (Identity, Bank, Personal, Nominee, Scheme) is
// filled in by the RM in rm-portal.
//
// :regime is /nre or /nro, mirroring the account type. Every /:regime/...
// route is wrapped in RequireLogin, which only a valid link unlocks.
export default function App() {
  // Re-applies the regime's solid brand color on every fresh page load.
  useEffect(() => {
    applyRegimeTheme();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<ContinueFromLink />} />
      <Route path="/continue/:token" element={<ContinueFromLink />} />
      <Route path="/:regime/review" element={<RequireLogin><ReviewStep /></RequireLogin>} />
      <Route path="/:regime/verify-email" element={<RequireLogin><EmailVerificationStep /></RequireLogin>} />
      <Route path="/:regime/payment" element={<RequireLogin><PaymentStep /></RequireLogin>} />
      <Route path="/:regime/payment-complete" element={<RequireLogin><PaymentCompleteStep /></RequireLogin>} />
      <Route path="/:regime/payment-failed" element={<RequireLogin><PaymentFailedStep /></RequireLogin>} />
      <Route path="/:regime/photo" element={<RequireLogin><LivePhotoStep /></RequireLogin>} />
      <Route path="/:regime/esign" element={<RequireLogin><EsignStep /></RequireLogin>} />
      <Route path="/:regime/submit" element={<RequireLogin><SubmitStep /></RequireLogin>} />
      <Route path="*" element={<ContinueFromLink />} />
    </Routes>
  );
}
