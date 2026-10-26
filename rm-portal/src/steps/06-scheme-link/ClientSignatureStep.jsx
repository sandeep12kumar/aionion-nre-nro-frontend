import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import StepFooter from "../../components/layout/StepFooter";
import UploadDropzone from "../../components/ui/UploadDropzone";
import { viewStoredDocument } from "../../services/viewDocument";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";

// Only shown when the RM answered "No" to "Do you have an Aadhaar card?" --
// without Aadhaar the client can't e-sign, so the RM collects the physical
// signature specimen here, before the client link is sent.
export default function ClientSignatureStep({ onNext, onBack }) {
  const panNumber = getPanNumber();

  const [hasSignature, setHasSignature] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!panNumber) return;
    api.get(`/documents/${panNumber}`).then(({ data }) => {
      setHasSignature(data.documents.some((d) => d.document_type === "signature"));
    });
  }, [panNumber]);

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected || !panNumber) return;

    setSignatureFile(selected);
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      formData.append("panNumber", panNumber);
      formData.append("documentType", "signature");
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHasSignature(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save signature.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!hasSignature) {
      setError("Please upload the client's signature before continuing.");
      return;
    }
    onNext();
  };

  return (
    <Card className="p-8">
      <div>
        <p className="text-xs font-semibold tracking-wide text-pink-500">NO AADHAAR · SIGNATURE REQUIRED</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Client signature</h2>
        <p className="mt-1 text-sm text-slate-500">
          The client doesn't have Aadhaar, so they can't e-sign. Collect their physical signature specimen here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-pink-500">REQUIRED DOCUMENT</p>
              <p className="text-sm font-semibold text-slate-800">Physical signature specimen</p>
            </div>
            <Badge tone={hasSignature ? "green" : "grey"}>{hasSignature ? "Signature saved" : "Not added"}</Badge>
          </div>

          <UploadDropzone
            title="Choose a Signature"
            subtitle="JPG, JPEG or PNG up to 5 MB"
            fileName={signatureFile?.name}
            uploading={uploading}
            disabled={uploading}
            onChange={handleFileChange}
            onView={hasSignature && !uploading ? () => viewStoredDocument(panNumber, "signature") : undefined}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <StepFooter onBack={onBack} submitLabel="Continue" loading={uploading} />
      </form>
    </Card>
  );
}
