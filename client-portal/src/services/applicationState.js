// client-portal session, set by ContinueFromLink when the client opens the
// link their Relationship Manager emailed them. Keys are prefixed client_
// so they never collide with rm-portal's session on a shared origin.
const PAN_NUMBER_KEY = "client_pan_number";
const ACCOUNT_TYPE_KEY = "client_account_type";
const HAS_AADHAAR_KEY = "client_has_aadhaar";
const LINK_TOKEN_KEY = "client_link_token";

export function setClientSession({ token, panNumber, accountType, hasAadhaar }) {
  localStorage.setItem(LINK_TOKEN_KEY, token);
  localStorage.setItem(PAN_NUMBER_KEY, panNumber);
  localStorage.setItem(HAS_AADHAAR_KEY, hasAadhaar ? "yes" : "no");
  setAccountType(accountType);
}

// RequireLogin (components/layout/RequireLogin.jsx) checks this on every
// /:regime/... route -- only a valid emailed link sets it.
export function isLoggedIn() {
  return Boolean(localStorage.getItem(LINK_TOKEN_KEY) && getPanNumber());
}

export function getLinkToken() {
  return localStorage.getItem(LINK_TOKEN_KEY);
}

// true -> the client e-signs with Aadhaar (the E-sign step is shown);
// false -> the RM already collected their signature.
export function getHasAadhaar() {
  return localStorage.getItem(HAS_AADHAAR_KEY) === "yes";
}

// Mirrors tailwind.config.js's theme.colors.brand -- kept in sync manually
// since Tailwind config isn't importable into runtime browser code.
const REGIME_COLORS = { NRE: "#0023FF", NRO: "#FE667C" };

// Sets --regime-color on the document root so any element styled with
// bg-[var(--regime-color)] picks up the current regime's solid brand color.
export function applyRegimeTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--regime-color", REGIME_COLORS[getAccountType()]);
}

function setAccountType(accountType) {
  localStorage.setItem(ACCOUNT_TYPE_KEY, accountType);
  applyRegimeTheme();
}

export function getAccountType() {
  return localStorage.getItem(ACCOUNT_TYPE_KEY) || "NRE";
}

// URL prefix that mirrors the account type (/nre or /nro).
export function getBasePath() {
  return getAccountType() === "NRE" ? "/nre" : "/nro";
}

export function getPanNumber() {
  return localStorage.getItem(PAN_NUMBER_KEY);
}

// Maps where the client left off (see clientLinkController.resolveClientLink)
// to the step that picks up from there. current_step is 'scheme_payment'
// until payment succeeds, then 'review_sign' until submission ('done').
export function resumeStepPath({ currentStep, status, hasLivePhoto, hasAadhaar, esignStatus }) {
  const basePath = getBasePath();
  if (status === "completed" || currentStep === "done") return `${basePath}/submit`;
  if (currentStep === "review_sign") {
    if (!hasLivePhoto) return `${basePath}/photo`;
    if (hasAadhaar && esignStatus !== "completed") return `${basePath}/esign`;
    return `${basePath}/submit`;
  }
  return `${basePath}/review`;
}

export function clearSession() {
  localStorage.removeItem(PAN_NUMBER_KEY);
  localStorage.removeItem(ACCOUNT_TYPE_KEY);
  localStorage.removeItem(HAS_AADHAAR_KEY);
  localStorage.removeItem(LINK_TOKEN_KEY);
}
