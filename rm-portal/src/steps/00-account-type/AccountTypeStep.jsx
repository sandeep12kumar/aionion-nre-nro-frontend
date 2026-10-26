import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import { setAccountType, hasChosenAccountType, getAccountType, getBasePath } from "../../services/applicationState";

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

// First RM step after login (/account-type): NRE or NRO decides the /nre or
// /nro flow that follows, starting with the Aadhaar check.
export default function AccountTypeStep() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(hasChosenAccountType() ? getAccountType() : "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) {
      setError("Choose NRE or NRO to continue.");
      return;
    }
    setAccountType(selected);
    navigate(`${getBasePath()}/aadhaar`);
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter onBack={() => navigate("/")} submitLabel="Continue" />
        </form>
      </Card>
    </OnboardingShell>
  );
}
