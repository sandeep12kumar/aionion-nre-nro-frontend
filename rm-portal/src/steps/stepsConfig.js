import { getBasePath, getAccountType } from "../services/applicationState";

// The Relationship Manager's half of the journey. When the RM finishes the
// last step, a link is emailed to the client, who continues in
// client-portal (Review, Payment, Live photo, E-sign, PDF & submit).
export const STEPS = [
  {
    // First step after RM login; lives at /account-type (no /nre or /nro
    // prefix yet, since this is where the regime gets chosen).
    id: "account_type",
    path: "/account-type",
    absolute: true,
    title: "Account type",
    subtitle: "NRE or NRO",
  },
  {
    id: "aadhaar",
    path: "/aadhaar",
    title: "Aadhaar check",
    subtitle: "Decides how the client signs",
  },
  {
    id: "identity_contact",
    path: "/identity",
    title: "Identity",
    subtitle: "PAN, Income Tax and DigiLocker",
  },
  {
    id: "bank_proofs",
    path: "/bank",
    title: "Bank & proofs",
    // Getter so the sidebar reflects the currently chosen NRE/NRO on every render.
    get subtitle() {
      return `${getAccountType()} bank and PIS proofs`;
    },
  },
  {
    id: "address_proofs",
    path: "/address",
    title: "Address proofs",
    subtitle: "Indian and foreign address proofs",
  },
  {
    id: "personal_nominee",
    path: "/profile",
    title: "Personal & Nominee",
    subtitle: "Profile, tax and nominee details",
  },
  {
    id: "scheme_link",
    path: "/scheme",
    title: "Scheme & client link",
    subtitle: "Scheme, signature and client link",
  },
];

export function stepIndex(stepId) {
  return STEPS.findIndex((step) => step.id === stepId);
}

export function progressPercent(stepId) {
  const index = stepIndex(stepId);
  if (index === -1) return 0;
  return Math.round(((index + 1) / STEPS.length) * 100);
}

// Every step's path is relative (e.g. "/bank") -- this prefixes it with
// /nre or /nro so the URL always reflects the applicant's chosen regime.
export function stepPath(step) {
  return step.absolute ? step.path : `${getBasePath()}${step.path}`;
}
