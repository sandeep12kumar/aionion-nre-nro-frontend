import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import LivePhotoCaptureStep from "./LivePhotoCaptureStep";
import { getBasePath } from "../../services/applicationState";
import { nextStepPath } from "../stepsConfig";

// Back goes to Review rather than Payment -- by now the client has paid.
export default function LivePhotoStep() {
  const navigate = useNavigate();

  return (
    <OnboardingShell currentStepId="photo">
      <LivePhotoCaptureStep
        onNext={() => navigate(nextStepPath("photo"))}
        onBack={() => navigate(`${getBasePath()}/review`)}
      />
    </OnboardingShell>
  );
}
