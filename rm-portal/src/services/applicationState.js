// rm-portal session. Keys are prefixed rm_ so they never collide with
// client-portal's own session if both apps are ever served from one origin.
const RM_EMAIL_KEY = "rm_email";
const PAN_NUMBER_KEY = "rm_pan_number";
const KRA_BRANCH_KEY = "rm_kra_branch";
const PREFILL_EMAIL_KEY = "rm_prefill_email";
const ACCOUNT_TYPE_KEY = "rm_account_type";
const HAS_AADHAAR_KEY = "rm_has_aadhaar";

// Set once RmLoginStep verifies the RM's email via OTP. RequireLogin
// (components/layout/RequireLogin.jsx) checks this on every /:regime/...
// route so a direct or bookmarked URL can't skip the login gate.
export function setRmEmail(email) {
  localStorage.setItem(RM_EMAIL_KEY, email);
}

export function getRmEmail() {
  return localStorage.getItem(RM_EMAIL_KEY) || "";
}

export function isLoggedIn() {
  return Boolean(getRmEmail());
}

// Mirrors tailwind.config.js's theme.colors.brand -- kept in sync manually
// since Tailwind config isn't importable into runtime browser code. Once an
// account type is chosen, every primary button/progress indicator/highlight
// switches from the neutral blue->pink gradient to a solid color matching
// that regime, via the --regime-color CSS custom property applied below.
const REGIME_COLORS = { NRE: "#0023FF", NRO: "#FE667C" };

// Sets --regime-color on the document root so any element styled with
// bg-[var(--regime-color)] picks up the current regime's solid brand color.
// Called automatically by setAccountType, and once on app mount (App.jsx)
// so a page refresh mid-flow re-applies it without needing a fresh choice.
export function applyRegimeTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--regime-color", REGIME_COLORS[getAccountType()]);
}

// NRE or NRO, chosen on the Account type page right after RM login -- it
// sets the /nre or /nro URL prefix and which bank documents are asked for.
export function setAccountType(accountType) {
  localStorage.setItem(ACCOUNT_TYPE_KEY, accountType);
  applyRegimeTheme();
}

export function getAccountType() {
  return localStorage.getItem(ACCOUNT_TYPE_KEY) || "NRE";
}

// getAccountType() falls back to NRE for theming; this says whether the RM
// has actually picked one for the current application.
export function hasChosenAccountType() {
  return ["NRE", "NRO"].includes(localStorage.getItem(ACCOUNT_TYPE_KEY));
}

// URL prefix that mirrors the chosen regime (/nre or /nro) so the address
// bar itself tells the RM which flow they're in.
export function getBasePath() {
  return getAccountType() === "NRE" ? "/nre" : "/nro";
}

// The RM's answer to "Do you have an Aadhaar card?" -- true means the
// client e-signs with Aadhaar in client-portal; false means the RM collects
// the client's signature at the end of the Scheme step. null = unanswered.
export function setHasAadhaar(hasAadhaar) {
  localStorage.setItem(HAS_AADHAAR_KEY, hasAadhaar ? "yes" : "no");
}

export function getHasAadhaar() {
  const value = localStorage.getItem(HAS_AADHAAR_KEY);
  return value === "yes" ? true : value === "no" ? false : null;
}

// The applicant's PAN is the key that links their data across all steps —
// there's no separate "application" record.
export function setPanNumber(panNumber) {
  localStorage.setItem(PAN_NUMBER_KEY, panNumber);
}

export function getPanNumber() {
  return localStorage.getItem(PAN_NUMBER_KEY);
}

export function setKraBranch(branch) {
  localStorage.setItem(KRA_BRANCH_KEY, branch);
}

export function getKraBranch() {
  return localStorage.getItem(KRA_BRANCH_KEY);
}

// Email from the client's DigiLocker account (Aadhaar clients), so the
// Personal profile can prefill it. Always writes (clearing when falsy) so a
// stale email from an earlier, unrelated PAN never bleeds into a fresh one.
export function setPrefillEmail(email) {
  // Emails are kept in UPPERCASE everywhere (the server stores them that way).
  if (email) localStorage.setItem(PREFILL_EMAIL_KEY, email.toUpperCase());
  else localStorage.removeItem(PREFILL_EMAIL_KEY);
}

export function getPrefillEmail() {
  return localStorage.getItem(PREFILL_EMAIL_KEY) || "";
}

// Clears the current client's application but keeps the RM signed in --
// used by "Start over" and "Start a new application".
export function clearApplication() {
  localStorage.removeItem(PAN_NUMBER_KEY);
  localStorage.removeItem(KRA_BRANCH_KEY);
  localStorage.removeItem(PREFILL_EMAIL_KEY);
  localStorage.removeItem(ACCOUNT_TYPE_KEY);
  localStorage.removeItem(HAS_AADHAAR_KEY);
  applyRegimeTheme();
}

export function clearSession() {
  clearApplication();
  localStorage.removeItem(RM_EMAIL_KEY);
}
