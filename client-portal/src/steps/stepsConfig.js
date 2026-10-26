import { getBasePath, getHasAadhaar } from "../services/applicationState";

// The client's half of the journey, opened from the link their RM emailed.
// The last step, E-sign, is where the application is signed and submitted:
// Aadhaar holders sign with Aadhaar OTP (/esign) and then it's submitted;
// everyone else (the RM already collected their signature in rm-portal)
// goes straight to /submit, which submits it and shows the confirmation.
const ALL_STEPS = [
  {
    id: "review",
    path: "/review",
    title: "Review",
    subtitle: "Check the details your RM filled in",
  },
  {
    id: "verify_email",
    path: "/verify-email",
    title: "One factor verification",
    subtitle: "Confirm your email with a code",
  },
  {
    id: "payment",
    path: "/payment",
    title: "Payment",
    subtitle: "Pay for your chosen scheme",
  },
  {
    id: "photo",
    path: "/photo",
    title: "Live photo",
    subtitle: "Quick selfie liveness check",
  },
  {
    id: "esign",
    get path() {
      return getHasAadhaar() ? "/esign" : "/submit";
    },
    title: "E-sign",
    subtitle: "Sign and submit",
  },
];

export function getSteps() {
  return ALL_STEPS;
}

export function stepIndex(stepId) {
  return getSteps().findIndex((step) => step.id === stepId);
}

export function progressPercent(stepId) {
  const steps = getSteps();
  const index = stepIndex(stepId);
  if (index === -1) return 0;
  return Math.round(((index + 1) / steps.length) * 100);
}

// Every step's path is relative (e.g. "/payment") -- this prefixes it with
// /nre or /nro so the URL always reflects the account type.
export function stepPath(step) {
  return `${getBasePath()}${step.path}`;
}

// The step after `stepId`.
export function nextStepPath(stepId) {
  const steps = getSteps();
  const next = steps[stepIndex(stepId) + 1];
  return next ? stepPath(next) : null;
}

export function prevStepPath(stepId) {
  const steps = getSteps();
  const prev = steps[stepIndex(stepId) - 1];
  return prev ? stepPath(prev) : null;
}
