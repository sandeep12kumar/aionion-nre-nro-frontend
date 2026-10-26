import { getSteps, stepIndex } from "../../steps/stepsConfig";
import { IdCardIcon, CardIcon, CameraIcon, CheckCircleIcon, MailIcon } from "../ui/icons";

const STEP_ICONS = {
  review: CheckCircleIcon,
  verify_email: MailIcon,
  payment: CardIcon,
  photo: CameraIcon,
  esign: IdCardIcon,
};

export default function StepSidebar({ currentStepId }) {
  const steps = getSteps();
  const currentIndex = stepIndex(currentStepId);

  return (
    <div className="w-full max-w-xs shrink-0 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-pink-500">YOUR APPLICATION</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Account opening steps</h2>

        <ol className="mt-5 space-y-2">
          {steps.map((step, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            const Icon = STEP_ICONS[step.id];

            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-[var(--regime-color)] text-white"
                    : isDone
                      ? "bg-emerald-50"
                      : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-white text-white"
                      : isDone
                        ? "border-emerald-500 bg-white text-emerald-600"
                        : "border-slate-300 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? "text-white" : isDone ? "text-emerald-700" : "text-slate-700"}`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${isActive ? "text-white/80" : "text-slate-400"}`}>{step.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-900"></p>
        <p className="mt-1 text-xs text-indigo-700">Encrypted in transit and used only for regulatory verification.</p>
      </div> */}
    </div>
  );
}
