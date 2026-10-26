import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Select from "../../components/ui/Select";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import {
  getHasAadhaar,
  setHasAadhaar,
  getPanNumber,
  getBasePath,
} from "../../services/applicationState";

const OPTIONS = ["Yes", "No"];

// RM step after the account type: the answer decides how the client signs.
//   Yes -> the client e-signs with Aadhaar in client-portal.
//   No  -> the RM collects a signature (upload / signature pad) at the end
//          of the Scheme step, before sending the client link.
export default function AadhaarStep() {
  const navigate = useNavigate();
  const saved = getHasAadhaar();
  const [answer, setAnswer] = useState(
    saved === true ? "Yes" : saved === false ? "No" : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!answer) {
      setError("Please choose Yes or No.");
      return;
    }

    const hasAadhaar = answer === "Yes";
    setLoading(true);
    try {
      // Once a PAN exists the answer lives on the application too; before
      // that, IdentityKraStep sends it along with the PAN verification.
      const panNumber = getPanNumber();
      if (panNumber)
        await api.patch(`/identity/${panNumber}/aadhaar`, { hasAadhaar });
      setHasAadhaar(hasAadhaar);
      navigate(`${getBasePath()}/identity`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save your answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell currentStepId='aadhaar'>
      <Card className='p-8'>
        <div>
          <p className='text-xs font-semibold tracking-wide text-pink-500'>
            SIGNING METHOD
          </p>
          <h2 className='mt-1 text-2xl font-bold text-slate-900'>
            Aadhaar check
          </h2>
          <p className='mt-1 text-sm text-slate-500'>
            This decides how the client signs the application at the end.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
          <Select
            label='Do you have Aadhaar card?'
            required
            options={OPTIONS}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className='max-w-sm'
          />

          {answer && (
            <p className='rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
              {answer === "Yes"
                ? "The client will sign using Aadhaar e-sign on their side, after payment and live photo."
                : "You'll collect the client's signature and upload at the last step, before sending the client link."}
            </p>
          )}

          {error && <p className='text-sm text-red-500'>{error}</p>}

          <StepFooter
            onBack={() => navigate("/account-type")}
            submitLabel='Continue'
            loading={loading}
          />
        </form>
      </Card>
    </OnboardingShell>
  );
}
