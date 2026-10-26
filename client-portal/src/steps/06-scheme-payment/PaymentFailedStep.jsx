import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getBasePath } from "../../services/applicationState";

export default function PaymentFailedStep() {
  const navigate = useNavigate();

  return (
    <OnboardingShell currentStepId="payment">
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">✕</div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Payment failed</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Your payment could not be completed. No amount has been charged. Please try again.
        </p>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate(`${getBasePath()}/payment`)}>Try again →</Button>
        </div>
      </Card>
    </OnboardingShell>
  );
}
