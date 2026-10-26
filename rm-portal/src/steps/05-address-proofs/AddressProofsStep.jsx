import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { getPanNumber, getKraBranch, getBasePath } from "../../services/applicationState";
import IdProofUpload from "./IdProofUpload";

// Address proofs: one Indian (passport or Aadhaar) and one foreign address proof, same for
// NRE and NRO (document types local_id_proof / foreign_id_proof). The name and
// address are read from the uploaded document (OCR), corrected by the RM if
// needed, and stored. Server side: services/proofs/idProofOcr.js (via
// nreProofs / nroProofs). Comes after Bank & proofs, before Personal & Nominee.
const REQUIRED_DOCS = ["local_id_proof", "foreign_id_proof"];

export default function AddressProofsStep() {
  const navigate = useNavigate();
  const panNumber = getPanNumber();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // proofs whose typed name/address changed after upload and aren't saved yet
  const [unsaved, setUnsaved] = useState({});
  const onDirtyChange = useCallback((documentType, dirty) => {
    setUnsaved((u) => (u[documentType] === dirty ? u : { ...u, [documentType]: dirty }));
  }, []);

  const refreshDocuments = () => {
    if (!panNumber) return;
    api.get(`/documents/${panNumber}`).then(({ data }) => setDocuments(data.documents));
  };
  useEffect(refreshDocuments, [panNumber]);

  const docFor = (type) => documents.find((d) => d.document_type === type);
  const idProof = (documentType, section) => ({
    panNumber,
    documentType,
    section,
    existingFileName: docFor(documentType)?.file_name || null,
    details: docFor(documentType)?.extracted_details || null,
    onChange: refreshDocuments,
    onDirtyChange,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!REQUIRED_DOCS.every((type) => docFor(type))) {
      setError("Please upload both the local and the foreign address proof before continuing.");
      return;
    }
    const pending = REQUIRED_DOCS.filter((type) => unsaved[type]);
    if (pending.length) {
      const names = pending.map((type) => (type === "local_id_proof" ? "Indian" : "foreign")).join(" and ");
      setError(`Complete and save the name and address on the ${names} address proof (or upload the required document) before continuing.`);
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/identity/${panNumber}/progress`, { currentStep: "personal_profile" });
      navigate(`${getBasePath()}/profile`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell currentStepId="address_proofs" kraBranch={getKraBranch()}>
      <Card className="p-4 sm:p-6 lg:p-8">
        <p className="text-xs font-semibold tracking-wide text-pink-500">ADDRESS PROOFS</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Indian and foreign address proofs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload the passport or Aadhaar as the Indian address proof, and any foreign address proof. We'll read the name and address from the document — check
          them and correct anything that's wrong.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-4">
            <IdProofUpload {...idProof("local_id_proof", "local")} title="Indian address proof"
              uploadTitle="Upload Passport or Aadhaar"
              uploadSubtitle="Passport (with the address page) or Aadhaar (both sides) — image or PDF. We'll identify it and read the name and address."
            />
            <IdProofUpload {...idProof("foreign_id_proof", "foreign")} title="Foreign address proof"
              uploadTitle="Upload any foreign address proof"
              uploadSubtitle="Passport, OCI card, driving licence, utility bill or bank statement — image or PDF. We'll identify it and read the name and address."
            />
          </div>
          <p className="text-xs text-slate-400">
            Documents should be current, legible and show the account holder's full name. PDF, JPG and PNG files are
            supported.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter onBack={() => navigate(`${getBasePath()}/bank`)} submitLabel="Continue" loading={loading} />
        </form>
      </Card>
    </OnboardingShell>
  );
}
