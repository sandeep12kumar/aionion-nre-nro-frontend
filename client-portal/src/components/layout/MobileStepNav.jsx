import { useNavigate } from "react-router-dom";
import { getSteps, stepIndex, stepPath } from "../../steps/stepsConfig";

export default function MobileStepNav({ currentStepId }) {
  const navigate = useNavigate();
  const STEPS = getSteps();
  const index = stepIndex(currentStepId);
  const current = STEPS[index];
  const prevStep = STEPS[index - 1];
  const nextStep = STEPS[index + 1];
  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[var(--regime-color)] hover:text-[var(--regime-color)] disabled:opacity-40";

  return (
    <div className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
      <button type="button" disabled={!prevStep} onClick={() => prevStep && navigate(stepPath(prevStep))} className={arrow}>
        ←
      </button>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--regime-color)]">
          Step {index + 1} of {STEPS.length}
        </p>
        <p className="text-sm font-bold text-slate-900">{current?.title}</p>
      </div>
      <button type="button" disabled={!nextStep} onClick={() => nextStep && navigate(stepPath(nextStep))} className={arrow}>
        →
      </button>
    </div>
  );
}
