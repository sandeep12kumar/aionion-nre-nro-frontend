import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { CheckCircleIcon } from "../../components/ui/icons";
import { nextStepPath } from "../stepsConfig";

export default function PaymentCompleteStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientCode = searchParams.get("code");

  return (
    <OnboardingShell currentStepId="payment">
      <Card className="p-8 text-center">
        <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-500" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Congratulations!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Your payment has been completed successfully.
        </p>

        {/* {clientCode && (
          <div className="mx-auto mt-6 max-w-xs rounded-xl bg-brand-gradient p-4 text-white">
            <p className="text-xs font-semibold tracking-wide opacity-80">YOUR CLIENT CODE</p>
            <p className="mt-1 text-2xl font-bold tracking-wide">{clientCode}</p>
          </div>
        )} */}

        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate(nextStepPath("payment"))}>Continue to Live Photo →</Button>
        </div>
      </Card>
    </OnboardingShell>
  );
}
