// Browser copy of server/services/proofs/bankProofMatch.js, for live feedback
// on the bank step -- the server re-checks on save. Keep the two in step.
// Only the account statement (or NRO cancelled cheque) is matched; the PIS
// proof is for a separate PIS account.
//
// Each field is "match" | "mismatch" | "not_found". Overall:
//   matched    -- account number AND IFSC were read and both agree
//   mismatch   -- either one disagrees
//   unverified -- either one couldn't be read

const pick = (d, camel, snake) => d?.[camel] ?? d?.[snake] ?? null;

function compareAccountNumber(ocrValue, entered) {
  const ocr = String(ocrValue || "").toUpperCase();
  const typed = String(entered || "").replace(/\D/g, "");
  if (!ocr || !typed) return "not_found";
  if (ocr.includes("X")) {
    const visible = ocr.replace(/^X+/, "");
    if (/X/.test(visible)) return "not_found";
    return typed.endsWith(visible) ? "match" : "mismatch";
  }
  return ocr === typed ? "match" : "mismatch";
}

function compareIfsc(ocrValue, entered) {
  const ocr = String(ocrValue || "").toUpperCase();
  const typed = String(entered || "").toUpperCase();
  if (!ocr || !typed) return "not_found";
  return ocr === typed ? "match" : "mismatch";
}

export function compareBankProof(extracted, entered) {
  const fields = {
    accountNumber: compareAccountNumber(pick(extracted, "accountNumber", "account_number"), entered.accountNumber),
    ifscCode: compareIfsc(pick(extracted, "ifscCode", "ifsc_code"), entered.ifscCode),
  };
  const values = Object.values(fields);
  let status = "unverified";
  if (values.includes("mismatch")) status = "mismatch";
  else if (values.every((v) => v === "match")) status = "matched";
  return { status, fields };
}

export const FIELD_LABELS = { accountNumber: "Account number", ifscCode: "IFSC" };
