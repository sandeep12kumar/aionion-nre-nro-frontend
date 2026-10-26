import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import PhaseTabs from "../../components/layout/PhaseTabs";
import PersonalProfileStep from "./PersonalProfileStep";
import NomineeAllocationStep from "../05-nominee-allocation/NomineeAllocationStep";
import { getKraBranch, getBasePath } from "../../services/applicationState";

const PHASES = ["personal", "nominees"];
const LABELS = ["Personal profile", "Nominee & allocation"];

export default function PersonalNomineeStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState(() => {
    const index = PHASES.indexOf(searchParams.get("phase"));
    return index === -1 ? 0 : index;
  });

  return (
    <OnboardingShell currentStepId="personal_nominee" kraBranch={getKraBranch()}>
      <PhaseTabs phases={LABELS} activeIndex={phase} />
      {phase === 0 && (
        <PersonalProfileStep onNext={() => setPhase(1)} onBack={() => navigate(`${getBasePath()}/address`)} />
      )}
      {phase === 1 && (
        <NomineeAllocationStep onNext={() => navigate(`${getBasePath()}/scheme`)} onBack={() => setPhase(0)} />
      )}
    </OnboardingShell>
  );
}
