import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import PhaseTabs from "../../components/layout/PhaseTabs";
import SchemeSelectStep from "./SchemeSelectStep";
import ClientSignatureStep from "./ClientSignatureStep";
import SendClientLinkStep from "./SendClientLinkStep";
import { getKraBranch, getBasePath } from "../../services/applicationState";

// Every client gives a signature here -- Aadhaar holders also e-sign later in
// client-portal.
const phases = ["scheme", "signature", "client-link"];
const labels = ["Scheme", "Client signature", "Client link"];

export default function SchemeLinkStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState(() => {
    const index = phases.indexOf(searchParams.get("phase"));
    return index === -1 ? 0 : index;
  });
  const current = phases[phase];

  return (
    <OnboardingShell currentStepId="scheme_link" kraBranch={getKraBranch()}>
      <PhaseTabs phases={labels} activeIndex={phase} />
      {current === "scheme" && (
        <SchemeSelectStep
          onNext={() => setPhase(phase + 1)}
          onBack={() => navigate(`${getBasePath()}/profile?phase=nominees`)}
        />
      )}
      {current === "signature" && <ClientSignatureStep onNext={() => setPhase(phase + 1)} onBack={() => setPhase(phase - 1)} />}
      {current === "client-link" && <SendClientLinkStep onBack={() => setPhase(phase - 1)} />}
    </OnboardingShell>
  );
}
