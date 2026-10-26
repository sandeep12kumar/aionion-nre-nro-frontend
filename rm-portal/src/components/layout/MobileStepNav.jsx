import { useNavigate } from "react-router-dom";
import { STEPS, stepIndex, stepPath } from "../../steps/stepsConfig";

export default function MobileStepNav({ currentStepId }) {
  const navigate = useNavigate();
  const index = stepIndex(currentStepId);
  const current = STEPS[index];
  const prevStep = STEPS[index - 1];
  const nextStep = STEPS[index + 1];

  return (
    <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 lg:hidden">
      <button
        type="button"
        disabled={!prevStep}
        onClick={() => prevStep && navigate(stepPath(prevStep))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40"
      >
        ←
      </button>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Step {index + 1} of {STEPS.length}
        </p>
        <p className="text-sm font-bold text-slate-900">{current?.title}</p>
      </div>
      <button
        type="button"
        disabled={!nextStep}
        onClick={() => nextStep && navigate(stepPath(nextStep))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40"
      >
        →
      </button>
    </div>
  );
}
