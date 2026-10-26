import { useEffect, useState } from "react";
import api from "../../services/api";
import { viewStoredDocument } from "../../services/viewDocument";

// existingFileName reflects what the server actually has for this pan+type
// (passed down from the parent step's already-fetched documents list) so the
// tile shows the right state on load/resume, not just uploads made in this
// browser session. onRemoved/onUploaded both just ask the parent to
// re-fetch its documents list -- this component doesn't own that data.
export default function DocumentUploadTile({
  panNumber,
  documentType,
  title,
  subtitle,
  existingFileName,
  required = true,
  onUploaded,
  onRemoved,
  children, // optional panel under the tile, e.g. details read off the document
  extraFields, // optional { name: value } sent with the upload
  blockedReason, // when set, Browse is disabled and this is shown instead
}) {
  const [fileName, setFileName] = useState(existingFileName || null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFileName(existingFileName || null);
  }, [existingFileName]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("panNumber", panNumber);
      formData.append("documentType", documentType);
      Object.entries(extraFields || {}).forEach(([key, value]) => formData.append(key, value ?? ""));
      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileName(file.name);
      onUploaded?.(data.document);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Cancels a wrongly-uploaded document -- the tile goes back to empty so
  // the applicant can Browse for the correct file.
  const handleRemove = async () => {
    setError("");
    setRemoving(true);
    try {
      await api.delete(`/documents/${panNumber}/${documentType}`);
      setFileName(null);
      onRemoved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove document");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-w-0 rounded-xl border border-dashed border-slate-200 p-3 sm:p-4">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${fileName ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-500"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
            {fileName ? <path d="m5 12 4 4L19 6" /> : <path d="M12 19V5m-5 5 5-5 5 5" />}
          </svg>
        </span>
        <div className="min-w-0 flex-1 break-words">
          <p className="text-sm font-semibold text-slate-800">
            {title}
            {required && <span className="ml-0.5 text-pink-500">*</span>}
          </p>
          <p className="text-xs text-slate-500">{subtitle}</p>
          {fileName && <p className="break-all text-xs text-emerald-600">{fileName}</p>}
          {blockedReason && !fileName && <p className="text-xs text-amber-700">{blockedReason}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 pl-12 sm:pl-0">
        {fileName && (
          <button
            type="button"
            onClick={() => viewStoredDocument(panNumber, documentType)}
            disabled={uploading}
            title="View this document"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap px-1 text-sm font-semibold text-brand-blue disabled:opacity-50"
          >
            View
          </button>
        )}
        {fileName && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || uploading}
            title="Remove this document"
            aria-label="Remove this document"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            {removing ? "Removing…" : "✕"}
          </button>
        )}
        <label
          className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap px-1 text-sm font-semibold ${
            blockedReason ? "cursor-not-allowed text-slate-300" : "cursor-pointer text-brand-blue"
          }`}
        >
          {uploading ? "Uploading…" : fileName ? "Replace" : "Browse"}
          <input
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              handleFile(e);
              e.target.value = ""; // allow choosing the same file again
            }}
            disabled={uploading || removing || Boolean(blockedReason)}
          />
        </label>
      </div>
    </div>
    {fileName && children}
    </div>
  );
}
