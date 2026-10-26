import DocumentUploadTile from "../../components/ui/DocumentUploadTile";
import { StatementDetails, PisDetails } from "./ExtractedDetails";

// NRO bank proofs. Server side: server/services/proofs/nroProofs.js.
// NRE equivalent: NreProofUploads.jsx.

// Required on the bank proofs page (the ID proofs are on the Address proofs page).
// The PIS account statement and PIS permission letter are optional for NRO.
export const REQUIRED_DOCS = ["nro_bank_proof"];

// Bank proofs that must match the typed bank details, with user-facing names.
// (The PIS proof is for a separate PIS account and isn't matched.)
export const BANK_PROOFS = [["nro_bank_proof", "NRO bank statement / cancelled cheque"]];

export default function NroProofUploads({ panNumber, existingFileName, extractedFor, onChange, enteredBank, bankEntered }) {
  const tile = (documentType) => ({
    panNumber,
    documentType,
    existingFileName: existingFileName(documentType),
    onUploaded: onChange,
    onRemoved: onChange,
  });
  const statement = extractedFor("nro_bank_proof");
  const pis = extractedFor("nro_pis_statement");

  return (
    <>
      <div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">BANK PROOFS</p>
        <div className="grid gap-3">
          <DocumentUploadTile
            {...tile("nro_bank_proof")}
            title="NRO bank statement"
            subtitle="Cancelled cheque, or statement of the account entered above (image or PDF) with transactions from the last 6 months"
          >
            {statement && <StatementDetails details={statement} entered={enteredBank} ready={bankEntered} />}
          </DocumentUploadTile>
          <DocumentUploadTile
            {...tile("nro_pis_statement")}
            required={false}
            title="PIS account statement (optional)"
            subtitle="Statement of the PIS account (image or PDF), with transactions from the last 6 months"
          >
            {pis && <PisDetails details={pis} />}
          </DocumentUploadTile>
          <DocumentUploadTile
            {...tile("nro_pis_permission_letter")}
            required={false}
            title="PIS permission letter (optional)"
            subtitle="The bank's Portfolio Investment Scheme permission letter (image or PDF)"
          />
        </div>
      </div>
    </>
  );
}
