import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import api from "../../services/api";
import { getPanNumber, getAccountType, getHasAadhaar } from "../../services/applicationState";
import { nextStepPath } from "../stepsConfig";

// Both regimes take a local ID proof and a foreign ID proof.
const COMMON_PROOF_TYPES = [
  ["local_id_proof", "Indian address proof"],
  ["foreign_id_proof", "Foreign address proof"],
];
const BANK_PROOF_TYPES_BY_ACCOUNT_TYPE = {
  NRO: [
    ["nro_bank_proof", "NRO bank statement / cancelled cheque"],
    ["nro_pis_statement", "PIS account statement"],
    ["nro_pis_permission_letter", "PIS permission letter"],
    ...COMMON_PROOF_TYPES,
  ],
  NRE: [
    ["nre_bank_statement", "NRE account statement"],
    ["nre_pis_statement", "PIS account statement"],
    ["nre_pis_permission_letter", "PIS permission letter"],
    ...COMMON_PROOF_TYPES,
  ],
};
const SCHEME_LABELS = { lifeTime: "Life Time Advantage", annualCare: "Annual Care" };

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

function SummaryCard({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <div className="mb-2">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

// First client step: a read-only summary of everything the RM filled in.
// Corrections go back through the RM (rm-portal), so there's no Edit here.
export default function ReviewStep() {
  const navigate = useNavigate();
  const panNumber = getPanNumber();
  const accountType = getAccountType();
  const hasAadhaar = getHasAadhaar();
  const proofTypes = BANK_PROOF_TYPES_BY_ACCOUNT_TYPE[accountType];

  const [identity, setIdentity] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [bank, setBank] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [scheme, setScheme] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const hasDoc = (type) => documents.some((d) => d.document_type === type);

  useEffect(() => {
    if (!panNumber) return;
    const bankEndpoint = accountType === "NRE" ? "/nre-bank-details" : "/bank-details";
    Promise.all([
      api.get(`/identity/${panNumber}`),
      api.get(`/personal-details/${panNumber}`),
      api.get(`${bankEndpoint}/${panNumber}`),
      api.get(`/documents/${panNumber}`),
      api.get(`/nominees/${panNumber}`),
      api.get(`/scheme/${panNumber}`),
    ]).then(([identityRes, personalRes, bankRes, documentsRes, nomineesRes, schemeRes]) => {
      setIdentity(identityRes.data.identity);
      setPersonal(personalRes.data.personalDetails);
      setBank(bankRes.data.bankDetails);
      setDocuments(documentsRes.data.documents);
      setNominees(nomineesRes.data.nominees);
      setScheme(schemeRes.data.scheme);
    });
  }, [panNumber, accountType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!confirmed) {
      setError("Please confirm your details are correct to continue.");
      return;
    }
    try {
      // recorded in consent_logs (wording, time, IP)
      await api.post(`/consents/${panNumber}`, { type: "review_confirmation" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not record your confirmation. Please try again.");
      return;
    }
    navigate(nextStepPath("review"));
  };

  return (
    <OnboardingShell currentStepId="review">
      <Card className="p-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">REVIEW YOUR DETAILS</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Review your application</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your Relationship Manager has filled in these details. Please check them before you pay.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard title="Identity" subtitle="PAN and Aadhaar verification">
              <SummaryRow label="PAN" value={identity?.pan_number} />
              <SummaryRow label="PAN status" value={identity?.itr_pan_status === "valid" ? "Valid · Income Tax" : identity?.itr_pan_status} />
              {identity?.aadhaar_masked_number && <SummaryRow label="Aadhaar" value={`${identity.aadhaar_masked_number} · DigiLocker`} />}
              <SummaryRow label="Email" value={identity?.email} />
            </SummaryCard>

            <SummaryCard title="Personal profile" subtitle="Profile and tax details">
              <SummaryRow label="Full name" value={personal?.full_name} />
              <SummaryRow label="Phone" value={personal ? `${personal.phone_country_code} ${personal.phone_number}` : null} />
              <SummaryRow label="Residence" value={personal?.country_of_residence} />
              <SummaryRow label="Tax status" value={personal?.citizenship ? `${personal.citizenship} · FATCA declared` : null} />
            </SummaryCard>
          </div>

          <SummaryCard title={`Bank & document proofs (${accountType})`} subtitle="Bank and overseas proofs">
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={bank?.account_number ? "green" : "grey"}>
                {bank?.account_number ? `A/C detected · ${bank.account_number}` : `${accountType} bank proof uploaded`}
              </Badge>
              {proofTypes.map(([type, label]) => (
                <Badge key={type} tone={hasDoc(type) ? "green" : "grey"}>
                  {label}
                </Badge>
              ))}
            </div>
          </SummaryCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard title="Nominees" subtitle="Nomination and allocation">
              {nominees.length === 0 ? (
                <SummaryRow label="Nomination" value="Not completed" />
              ) : (
                nominees.map((n) => (
                  <SummaryRow key={n.id} label={`${n.nominee_name} (${n.relation})`} value={`${n.allocation_percentage}%`} />
                ))
              )}
            </SummaryCard>

            <SummaryCard title="Scheme & signing" subtitle="Chosen by your RM">
              <SummaryRow label="Scheme" value={scheme ? SCHEME_LABELS[scheme.scheme_key] || scheme.scheme_key : null} />
              <SummaryRow label="Amount payable" value={scheme?.total_amount ? `₹${scheme.total_amount}` : null} />
              <SummaryRow
                label="Signing"
                value={hasAadhaar ? "Aadhaar e-sign" : hasDoc("signature") ? "Signature collected by RM" : "Signature pending"}
              />
            </SummaryCard>
          </div>

          <p className="text-xs text-slate-400">
            Something not right? Please contact your Relationship Manager to correct it before you continue.
          </p>

          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I have reviewed the details above and confirm they are correct.
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" className="justify-center">
              Continue →
            </Button>
          </div>
        </form>
      </Card>
    </OnboardingShell>
  );
}

