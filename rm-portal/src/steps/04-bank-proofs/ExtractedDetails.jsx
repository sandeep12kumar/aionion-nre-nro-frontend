import { compareBankProof, FIELD_LABELS } from "../../services/bankProofMatch";

// "2026-08-18" -> "18 Aug 2026"; anything else is shown as OCR read it.
export function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || null;
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function maskAccount(value) {
  if (!value) return null;
  const s = String(value);
  return s.length > 4 ? `${"X".repeat(Math.min(s.length - 4, 8))}${s.slice(-4)}` : s;
}

// Label/value grid of what OCR read off a document. Rows with no value are hidden.
export function DetailsGrid({ title = "Details read from the document", rows, warning }) {
  const shown = rows.filter(([, value]) => value);
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
      <p className="mb-2 font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {warning && <p className="mb-2 font-medium text-amber-700">{warning}</p>}
      {shown.length ? (
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {shown.map(([label, value]) => (
            <div key={label} className="flex min-w-0 justify-between gap-2 border-b border-slate-100 pb-1 sm:block sm:border-0 sm:pb-0">
              <dt className="text-slate-400">{label}</dt>
              <dd className="break-words font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-slate-500">We couldn't read any details from this document. Upload a clearer copy if it's the right document.</p>
      )}
    </div>
  );
}

const FIELD_ICON = { match: "✓", mismatch: "✗", not_found: "–" };
const FIELD_TONE = { match: "text-emerald-700", mismatch: "text-red-600", not_found: "text-slate-400" };

// Match of a bank proof against the bank details typed above it.
export function BankMatch({ extracted, entered, ready }) {
  if (!ready) {
    return <p className="mt-2 text-xs text-slate-500">Enter the account number and IFSC above to check this document against them.</p>;
  }
  const { status, fields } = compareBankProof(extracted, entered);
  const banner = {
    matched: ["bg-emerald-50 text-emerald-700", "Matches the bank details entered"],
    mismatch: ["bg-red-50 text-red-600", "Does not match the bank details entered"],
    unverified: ["bg-amber-50 text-amber-700", "Couldn't read both the account number and IFSC to verify — upload a clearer copy"],
  }[status];
  return (
    <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${banner[0]}`} aria-live="polite">
      <p className="font-semibold">{banner[1]}</p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(fields).map(([field, value]) => (
          <span key={field} className={FIELD_TONE[value]}>
            {FIELD_ICON[value]} {FIELD_LABELS[field]}
            {value === "not_found" ? " (not found)" : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

export function bankMatchStatus(extracted, entered) {
  return compareBankProof(extracted, entered).status;
}

// ---- per-document panels, shared by NreProofUploads and NroProofUploads ----

// Account statement (or, for NRO, a cancelled cheque): only account number,
// IFSC and latest transaction are read, and the first two are matched
// against the typed bank details.
export function StatementDetails({ details: d, entered, ready }) {
  const isCheque = d.documentKind === "Cancelled Cheque";
  return (
    <>
      <DetailsGrid
        rows={[
          ["Document", isCheque ? d.documentKind : null],
          ["Account number", maskAccount(d.accountNumber)],
          ["IFSC", d.ifscCode],
          ["Cheque number", isCheque ? d.chequeNumber : null],
          ["Latest transaction", formatDate(d.latestTransactionDate)],
        ]}
      />
      <BankMatch extracted={d} entered={entered} ready={ready} />
    </>
  );
}

// PIS proof: the separate PIS account's own details. Not matched against
// the typed bank details.
export function PisDetails({ details: d }) {
  return (
    <DetailsGrid
      title="PIS account details read from the document"
      warning={d.isPisLetter === false ? "This doesn't look like a PIS document — check you've uploaded the right one." : null}
      rows={[
        ["Account number", d.accountNumber],
        ["IFSC", d.ifscCode],
        ["Account holder", d.accountHolderName],
        ["Account type", d.accountType],
        ["Bank", d.bankName],
        ["Branch", d.branchName],
        ["Branch address", d.branchAddress],
        ["City", d.city],
        ["MICR", d.micrCode],
        ["Latest transaction", formatDate(d.latestTransactionDate)],
      ]}
    />
  );
}

