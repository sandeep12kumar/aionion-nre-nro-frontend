import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import IdentityKraStep from "./IdentityKraStep";
import { getKraBranch, getBasePath } from "../../services/applicationState";

// The account type (NRE / NRO) is chosen earlier, right after RM login
// (steps/00-account-type), so this step starts at PAN (Income Tax check,
// then DigiLocker for clients with Aadhaar) and continues to Bank. The
// client's email is entered on the Personal profile and verified by the
// client (email OTP) in client-portal.
export default function IdentityStep() {
  const navigate = useNavigate();

  return (
    <OnboardingShell currentStepId="identity_contact" kraBranch={getKraBranch()}>
      <IdentityKraStep
        onNext={() => navigate(`${getBasePath()}/bank`)}
        onBack={() => navigate(`${getBasePath()}/aadhaar`)}
      />
    </OnboardingShell>
  );
}
