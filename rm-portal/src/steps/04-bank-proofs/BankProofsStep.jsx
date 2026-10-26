import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { getPanNumber, getKraBranch, getAccountType, getBasePath } from "../../services/applicationState";
import { bankMatchStatus } from "./ExtractedDetails";
import NreProofUploads, * as nre from "./NreProofUploads";
import NroProofUploads, * as nro from "./NroProofUploads";

// Bank details + bank proofs. The page shell and bank-details form are
// shared; the proof uploads and their rules are per regime
// (NreProofUploads.jsx / NroProofUploads.jsx). The local / foreign ID proofs
// are the next step (05-address-proofs).
const PROOFS_BY_TYPE = {
  NRE: { Uploads: NreProofUploads, requiredDocs: nre.REQUIRED_DOCS, bankProofs: nre.BANK_PROOFS },
  NRO: { Uploads: NroProofUploads, requiredDocs: nro.REQUIRED_DOCS, bankProofs: nro.BANK_PROOFS },
};

export default function BankProofsStep() {
  const navigate = useNavigate();
  const panNumber = getPanNumber();
  const kraBranch = getKraBranch();
  const accountType = getAccountType();

  const [focusedAccountField, setFocusedAccountField] = useState(null);
  // NRE flow: NRE Savings / NRE Current; NRO flow: NRO Savings / NRO Current
  const accountTypeOptions = [`${accountType} Savings`, `${accountType} Current`];
  // a value saved before the NRE / NRO prefix ("Savings" / "Current") shows as this flow's
  const withRegime = (type) => (/^(Savings|Current)$/.test(type || "") ? `${accountType} ${type}` : type || `${accountType} Savings`);
  const [bankForm, setBankForm] = useState({ accountNumber: "", confirmAccountNumber: "", ifscCode: "", accountType: `${accountType} Savings` });
  useEffect(() => {
    if (!panNumber || !["NRE", "NRO"].includes(accountType)) return;
    let active = true;
    api.get(`${accountType === "NRE" ? "/nre-bank-details" : "/bank-details"}/${panNumber}`).then(({ data }) => {
      if (!active || !data.bankDetails) return;
      setBankForm({ accountNumber: data.bankDetails.account_number || "", confirmAccountNumber: "", ifscCode: data.bankDetails.ifsc_code || "", accountType: withRegime(data.bankDetails.account_type) });
    }).catch(() => { if (active) setError("Could not load saved bank details. Enter them below."); });
    return () => { active = false; };
  }, [panNumber, accountType]);
  const [ifscLookup, setIfscLookup] = useState({ code: "", data: null, error: "", loading: false });
  useEffect(() => {
    const code = bankForm.ifscCode;
    let active = true;
    setIfscLookup({ code, data: null, error: "", loading: /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code) });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return;
    const timer = setTimeout(() => {
      api.get(`/nre-bank-details/ifsc/${code}`).then(({ data }) => {
        if (active) setIfscLookup({ code, data: data.bankDetails, error: "", loading: false });
      }).catch((err) => {
        if (active) setIfscLookup({ code, data: null, error: err.response?.data?.message || "Could not look up IFSC. Please try again.", loading: false });
      });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [bankForm.ifscCode]);
  // Penny drop: once the account number is confirmed and the IFSC is looked
  // up, the account is verified with the bank (server reuses an earlier
  // result for the same account + IFSC).
  const verifyKey =
    /^\d{6,30}$/.test(bankForm.accountNumber) &&
    bankForm.accountNumber === bankForm.confirmAccountNumber &&
    ifscLookup.code === bankForm.ifscCode &&
    ifscLookup.data &&
    (accountType !== "NRE" || ifscLookup.data.eligible)
      ? `${bankForm.accountNumber}|${bankForm.ifscCode}`
      : "";
  const [verification, setVerification] = useState({ key: "", loading: false, result: null, error: "" });
  const runVerification = (retry = false) => {
    if (!verifyKey || !panNumber) return () => {};
    let active = true;
    setVerification({ key: verifyKey, loading: true, result: null, error: "" });
    api.post(`/bank-verification/${panNumber}`, { accountNumber: bankForm.accountNumber, ifscCode: bankForm.ifscCode, retry })
      .then(({ data }) => { if (active) setVerification({ key: verifyKey, loading: false, result: data, error: "" }); })
      .catch((err) => {
        if (active) setVerification({ key: verifyKey, loading: false, result: null, error: err.response?.data?.message || "Could not verify the bank account. Please try again." });
      });
    return () => { active = false; };
  };
  useEffect(() => {
    if (!verifyKey) return;
    let cancel = () => {};
    const timer = setTimeout(() => { cancel = runVerification(); }, 600);
    return () => { clearTimeout(timer); cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyKey, panNumber]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshDocuments = () => {
    if (!panNumber) return;
    api.get(`/documents/${panNumber}`).then(({ data }) => setDocuments(data.documents));
  };

  useEffect(refreshDocuments, [panNumber]);

  const existingFileName = (type) => documents.find((d) => d.document_type === type)?.file_name || null;
  const extractedFor = (type) => documents.find((d) => d.document_type === type)?.extracted_details || null;

  const { Uploads, requiredDocs, bankProofs } = PROOFS_BY_TYPE[accountType];
  const hasAllRequiredDocs = requiredDocs.every((type) => documents.some((d) => d.document_type === type));

  // What the RM typed, for matching the bank proofs against.
  const ifscBankName = ifscLookup.code === bankForm.ifscCode ? ifscLookup.data?.bankName : null;
  const enteredBank = { accountNumber: bankForm.accountNumber, ifscCode: bankForm.ifscCode, bankName: ifscBankName };
  const bankEntered = /^\d{6,30}$/.test(bankForm.accountNumber) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!hasAllRequiredDocs) {
      setError("Please upload all required documents before continuing.");
      return;
    }
    // The server re-checks this on save.
    for (const [type, label] of bankProofs) {
      const extracted = extractedFor(type);
      if (!extracted) continue; // UAT dummy upload, nothing read
      const status = bankMatchStatus(extracted, enteredBank);
      if (status === "mismatch") {
        setError(`The ${label} doesn't match the bank details entered. Check the details or upload the correct document.`);
        return;
      }
      if (status === "unverified") {
        setError(`We couldn't read the account number or IFSC on the ${label}. Upload a clearer copy.`);
        return;
      }
    }

    setLoading(true);
    try {
      await api.post(accountType === "NRE" ? "/nre-bank-details" : "/bank-details", { panNumber, ...bankForm });
      await api.patch(`/identity/${panNumber}/progress`, { currentStep: "address_proofs" });
      navigate(`${getBasePath()}/address`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell currentStepId="bank_proofs" kraBranch={kraBranch}>
      <Card className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-pink-500">FINANCIAL DETAILS</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{accountType} bank proofs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the {accountType} bank details and upload the bank proofs. We'll read the details off each
              document and check the account statement against the bank details you enter.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            {accountType === "NRE" && (
              <p className="mb-3 text-xs font-semibold text-pink-500">
                Only HDFC Bank and AXIS Bank are accepted for NRE demat account opening.
              </p>
              
            )}
            {["NRE", "NRO"].includes(accountType) && (
              <section className="mb-6 rounded-xl border border-slate-200 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-slate-900">Enter your bank details</h3>
                <p className="mt-1 text-xs text-slate-500">Enter the details shown on your {accountType} bank proof.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="Account Number" aria-label="Account Number" required inputMode="numeric" pattern={focusedAccountField === "accountNumber" ? "[0-9]{6,30}" : "X{6,30}"} maxLength={30} autoComplete="off" spellCheck={false} onFocus={() => setFocusedAccountField("accountNumber")} onBlur={() => setFocusedAccountField(null)} value={focusedAccountField === "accountNumber" ? bankForm.accountNumber : "X".repeat(bankForm.accountNumber.length)} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, "") })} />
                  <Input label="Confirm Account Number" aria-label="Confirm Account Number" required inputMode="numeric" maxLength={30} autoComplete="off" spellCheck={false} onFocus={() => setFocusedAccountField("confirmAccountNumber")} onBlur={() => setFocusedAccountField(null)} value={focusedAccountField === "confirmAccountNumber" ? bankForm.confirmAccountNumber : "X".repeat(bankForm.confirmAccountNumber.length)} error={bankForm.confirmAccountNumber && bankForm.accountNumber !== bankForm.confirmAccountNumber ? "Account numbers do not match" : ""} onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value.replace(/\D/g, "") })} />
                  <Input label="Enter IFSC" aria-label="Enter IFSC" required maxLength={11} pattern={accountType === "NRE" ? "(HDFC|UTIB)0[A-Z0-9]{6}" : "[A-Z]{4}0[A-Z0-9]{6}"} value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
                  <Select label="Account Type" aria-label="Account Type" required options={accountTypeOptions} value={bankForm.accountType} onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })} />
                </div>
                {ifscLookup.code === bankForm.ifscCode && (
                  <div className="mt-3 text-sm" aria-live="polite">
                    {ifscLookup.loading && <p className="text-slate-500">Looking up bank details...</p>}
                    {ifscLookup.error && <p className="text-red-500">{ifscLookup.error}</p>}
                    {ifscLookup.data && (
                      <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
                        <p>Bank: <strong>{ifscLookup.data.bankName}</strong></p>
                        <p>Branch: <strong>{ifscLookup.data.branchName}</strong></p>
                        <p>MICR: <strong>{ifscLookup.data.micrCode || "-"}</strong></p>
                        {accountType === "NRE" && !ifscLookup.data.eligible && <p className="text-red-500 sm:col-span-3">Only HDFC Bank and AXIS Bank are accepted for NRE demat account opening.</p>}
                      </div>
                    )}
                  </div>
                )}
                {verifyKey && verification.key === verifyKey && (
                  <div className="mt-2 text-xs" aria-live="polite">
                    {verification.loading && <p className="text-slate-500">Verifying bank account...</p>}
                    {verification.result?.status === "verified" && (
                      <p className="font-medium text-green-600">
                        ✓ Verified{verification.result.accountHolderName ? ` — Account holder: ${verification.result.accountHolderName}` : ""}
                      </p>
                    )}
                    {(verification.result?.status === "failed" || verification.error) && (
                      <p className="text-red-500">
                        {verification.error || verification.result.message}{" "}
                        <button type="button" className="font-semibold underline" onClick={() => runVerification(true)}>Retry</button>
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
          <Uploads
            panNumber={panNumber}
            existingFileName={existingFileName}
            extractedFor={extractedFor}
            onChange={refreshDocuments}
            enteredBank={enteredBank}
            bankEntered={bankEntered}
          />
          <p className="text-xs text-slate-400">
            Documents should be current, legible and show the account holder's full name. PDF, JPG and PNG files
            are supported.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter onBack={() => navigate(`${getBasePath()}/identity?phase=contact`)} submitLabel="Continue" loading={loading} />
        </form>
      </Card>
    </OnboardingShell>
  );
}
