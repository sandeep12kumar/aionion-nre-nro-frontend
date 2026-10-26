import DocumentUploadTile from "../../components/ui/DocumentUploadTile";
import { StatementDetails, PisDetails } from "./ExtractedDetails";

// NRE bank proofs. Server side: server/services/proofs/nreProofs.js.
// NRO equivalent: NroProofUploads.jsx.

// Required on the bank proofs page (the ID proofs are on the Address proofs page).
export const REQUIRED_DOCS = ["nre_bank_statement", "nre_pis_statement", "nre_pis_permission_letter"];

// Bank proofs that must match the typed bank details, with user-facing names.
// (The PIS proof is for a separate PIS account and isn't matched.)
export const BANK_PROOFS = [["nre_bank_statement", "NRE account statement"]];

export default function NreProofUploads({ panNumber, existingFileName, extractedFor, onChange, enteredBank, bankEntered }) {
  const tile = (documentType) => ({
    panNumber,
    documentType,
    existingFileName: existingFileName(documentType),
    onUploaded: onChange,
    onRemoved: onChange,
  });
  const statement = extractedFor("nre_bank_statement");
  const pis = extractedFor("nre_pis_statement");

  return (
    <>
      <div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">BANK PROOFS</p>
        <div className="grid gap-3">
          <DocumentUploadTile
            {...tile("nre_bank_statement")}
            title="NRE Account Statement"
            subtitle="Statement of the account entered above (image or PDF), with transactions from the last 6 months"
          >
            {statement && <StatementDetails details={statement} entered={enteredBank} ready={bankEntered} />}
          </DocumentUploadTile>
          <DocumentUploadTile
            {...tile("nre_pis_statement")}
            title="PIS account statement"
            subtitle="Statement of the PIS account (image or PDF), with transactions from the last 6 months"
          >
            {pis && <PisDetails details={pis} />}
          </DocumentUploadTile>
          <DocumentUploadTile
            {...tile("nre_pis_permission_letter")}
            title="PIS permission letter"
            subtitle="The bank's Portfolio Investment Scheme permission letter (image or PDF)"
          />
        </div>
      </div>
    </>
  );
}
