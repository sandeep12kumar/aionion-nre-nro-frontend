import { useEffect, useState } from "react";
import Input from "../../components/ui/Input";
import DocumentUploadTile from "../../components/ui/DocumentUploadTile";
import api from "../../services/api";
import { DetailsGrid, formatDate } from "../04-bank-proofs/ExtractedDetails";

// [key, label, save form field]; required per section must match
// REQUIRED_ADDRESS in server/services/proofs/idProofOcr.js
const ADDRESS_FIELDS = [
  ["address1", "Address line 1", "idAddress1"],
  ["address2", "Address line 2", "idAddress2"],
  ["address3", "Address line 3", "idAddress3"],
  ["landmark", "Landmark", "idLandmark"],
  ["city", "City", "idCity"],
  ["district", "District", "idDistrict"],
  ["pincode", "Pin code", "idPincode"],
  ["state", "State", "idState"],
  ["country", "Country", "idCountry"],
];
const REQUIRED = {
  local: ["address1", "city", "pincode", "state", "country"],
  foreign: ["address1", "city", "country"],
};

const emptyAddress = () => Object.fromEntries(ADDRESS_FIELDS.map(([key]) => [key, ""]));

// The saved address; an upload from before the address was split into fields
// had a single line -- shown as Address line 1.
function savedAddress(details) {
  const saved = details?.enteredAddress;
  if (!saved) return emptyAddress();
  if (typeof saved === "string") return { ...emptyAddress(), address1: saved };
  return { ...emptyAddress(), ...saved };
}

const sameAddress = (a, b) => ADDRESS_FIELDS.every(([key]) => (a[key] || "").trim() === (b[key] || "").trim());

// Required fields (labels) that are empty.
function missingFields(name, address, section) {
  return [
    ...(String(name || "").trim() ? [] : ["Name"]),
    ...ADDRESS_FIELDS.filter(([key]) => REQUIRED[section].includes(key) && !String(address[key] || "").trim()).map(([, label]) => label),
  ];
}

// One address proof: just upload it. `requiredDocument` is the one document it must
// be (Indian proof: "Passport"); without it (foreign proof) any supported
// document is accepted and the server recognises its type from the text
// (server/services/proofs/idProofOcr.js documentLabelFor). The server reads
// the name and address off it (OCR) and saves them; they show here once the
// document is uploaded, and the RM can correct anything OCR got wrong or
// couldn't read (Save changes).
// onDirtyChange(documentType, true) while there's something to do before
// continuing: unsaved corrections, a required field still empty, or a stored
// upload that isn't the required document.
export default function IdProofUpload({
  panNumber, documentType, section, title, requiredDocument, uploadTitle, uploadSubtitle, existingFileName, details, onChange,
  onDirtyChange,
}) {
  const [name, setName] = useState(details?.enteredName || "");
  const [address, setAddress] = useState(savedAddress(details));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // pick up what the server has (page load / after upload or removal)
  useEffect(() => {
    if (!details) return;
    setName(details.enteredName || "");
    setAddress(savedAddress(details));
    setError("");
  }, [details]);

  const uploaded = Boolean(existingFileName);
  // An upload from before this proof had to be `requiredDocument` (e.g. an Aadhaar
  // as the Indian proof) must be replaced.
  const typeChanged = uploaded && Boolean(details) && Boolean(requiredDocument) && requiredDocument !== details.documentLabel;
  const showFields = uploaded && Boolean(details) && !typeChanged;
  const edited = showFields && (name.trim() !== (details.enteredName || "") || !sameAddress(address, savedAddress(details)));
  const savedMissing = showFields ? missingFields(details.enteredName, savedAddress(details), section) : [];
  const missing = missingFields(name, address, section);

  useEffect(() => {
    onDirtyChange?.(documentType, edited || typeChanged || savedMissing.length > 0);
  }, [documentType, edited, typeChanged, savedMissing.length, onDirtyChange]);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/documents/${panNumber}/${documentType}/id-details`, {
        idName: name.trim(),
        ...Object.fromEntries(ADDRESS_FIELDS.map(([key, , field]) => [field, address[key].trim()])),
      });
      onChange?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the name and address.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (e) => {
    const value = key === "pincode" && section === "local" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value;
    setAddress((a) => ({ ...a, [key]: value }));
  };
  const field = (key, label) => (
    <Input label={label} required={REQUIRED[section].includes(key)} value={address[key]} onChange={setField(key)} />
  );

  const expired = details?.expiryDate && details.expiryDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-slate-900">
        {title}
        <span className="ml-0.5 text-pink-500">*</span>
      </h3>

      {typeChanged && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          The uploaded {details.documentLabel} can't be used here. Upload the {requiredDocument} below to replace it.
        </p>
      )}

      <div className="mt-4">
        <DocumentUploadTile
          panNumber={panNumber}
          documentType={documentType}
          title={uploadTitle}
          subtitle={uploadSubtitle}
          existingFileName={existingFileName}
          onUploaded={onChange}
          onRemoved={onChange}
        >
          {showFields && (
            <DetailsGrid
              warning={expired ? `This document expired on ${formatDate(details.expiryDate)}.` : null}
              rows={[
                ["Document", details.documentLabel],
                ["Document number", details.documentNumber],
                ["Expiry date", formatDate(details.expiryDate)],
              ]}
            />
          )}
        </DocumentUploadTile>
      </div>

      {showFields && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold tracking-wide text-slate-400">READ FROM THE DOCUMENT</p>
          <p className="mt-1 text-xs text-slate-500">Check these against the document and correct anything that's wrong.</p>
          {savedMissing.length > 0 && !edited && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Couldn't read the {savedMissing.join(", ")} from the document — enter {savedMissing.length > 1 ? "them" : "it"} below
              and save.
            </p>
          )}

          <div className="mt-4 grid gap-4">
            <Input label="Name (as on the document)" required value={name} onChange={(e) => setName(e.target.value)} />
            {field("address1", "Address line 1")}
            {field("address2", "Address line 2")}
            {field("address3", "Address line 3")}
            {field("landmark", "Landmark")}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("city", "City")}
              {field("district", "District")}
              {field("pincode", "Pin code")}
              {field("state", "State")}
            </div>
            {field("country", "Country")}
          </div>

          {(edited || savedMissing.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="text-amber-700">
                {missing.length ? `Enter the ${missing.join(", ")}.` : "Changes not saved yet."}
              </span>
              <button
                type="button"
                onClick={save}
                disabled={saving || missing.length > 0}
                className="font-semibold text-brand-blue disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
