import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { setAccountType, hasChosenAccountType, getAccountType, getBasePath, getPanNumber, getRmEmail } from "../../services/applicationState";

const ACCOUNT_TYPES = [
  {
    key: "NRE",
    label: "NRE — Non Resident External",
    description: "For foreign income you want to keep freely repatriable to India.",
    // Each account type gets its own brand accent -- blue for NRE, pink for
    // NRO -- both for the selected-state border/fill and the "ACCOUNT TYPE"
    // label, instead of both cards sharing one hardcoded color.
    activeClass: "border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue",
    labelClass: "text-brand-blue",
    checkClass: "bg-brand-blue",
  },
  {
    key: "NRO",
    label: "NRO — Non Resident Ordinary",
    description: "For managing income earned in India (rent, dividends, pension, etc).",
    activeClass: "border-brand-pink bg-brand-pink/5 ring-1 ring-brand-pink",
    labelClass: "text-brand-pink",
    checkClass: "bg-brand-pink",
  },
];

// The RM's step after the video IPV (/account-type): NRE or NRO decides the /nre or
// /nro flow that follows, starting with the Aadhaar check.
// The RM can come back here (Back, or the sidebar) to correct the choice.
// Once the client's PAN is verified the application already exists, so a
// change moves it to the other account type (POST /identity/:pan/account-type):
// everything entered stays, except the bank & PIS documents, which the RM
// uploads again -- so it continues at Bank & proofs.
export default function AccountTypeStep() {
  const navigate = useNavigate();
  const chosen = hasChosenAccountType() ? getAccountType() : "";
  const panNumber = getPanNumber();
  const [selected, setSelected] = useState(chosen);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const switching = Boolean(panNumber && chosen && selected && selected !== chosen);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError("Choose NRE or NRO to continue.");
      return;
    }
    if (!switching) {
      setAccountType(selected);
      navigate(`${getBasePath()}/aadhaar`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post(`/identity/${panNumber}/account-type`, { accountType: selected, rmEmail: getRmEmail() });
      setAccountType(selected);
      navigate(`${getBasePath()}/bank`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to change the account type right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell currentStepId="account_type">
      <Card className="p-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">LET'S BEGIN</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Choose the account type</h2>
          <p className="mt-1 text-sm text-slate-500">
            This decides which bank documents we'll ask for later — every other step is the same either way.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {ACCOUNT_TYPES.map((type) => {
              const active = selected === type.key;
              return (
                <button
                  type="button"
                  key={type.key}
                  aria-pressed={active}
                  onClick={() => {
                    setSelected(type.key);
                    setError("");
                  }}
                  className={`relative rounded-2xl border p-5 text-left transition ${
                    active ? type.activeClass : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {active && (
                    <span
                      aria-label="Selected"
                      className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${type.checkClass}`}
                    >
                      ✓
                    </span>
                  )}
                  <p className={`text-xs font-semibold tracking-wide ${type.labelClass}`}>ACCOUNT TYPE</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{type.label}</p>
                  <p className="mt-2 text-sm text-slate-500">{type.description}</p>
                </button>
              );
            })}
          </div>

          {switching && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This application ({panNumber}) will change from {chosen} to {selected}. The details entered so far are kept,
              but the {chosen} bank and PIS documents are removed — you'll upload the {selected} ones next.
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter
            onBack={() => navigate("/ipv")}
            submitLabel={switching ? `Change to ${selected}` : "Continue"}
            loading={loading}
          />
        </form>
      </Card>
    </OnboardingShell>
  );
}
