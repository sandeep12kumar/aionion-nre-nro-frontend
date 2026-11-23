import Button from "../ui/Button";
import { CheckIcon } from "../ui/icons";

export default function StepFooter({ onBack, submitLabel, loading, disabled }) {
  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="order-1 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 sm:order-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
        Progress saved
      </p>
      <div className="order-2 flex gap-3 sm:order-1 sm:contents">
        <Button type="button" variant="outline" className="flex-1 justify-center sm:flex-none" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1 justify-center sm:order-3 sm:flex-none" disabled={loading || disabled}>
          {loading ? "Please wait…" : submitLabel} →
        </Button>
      </div>
    </div>
  );
}
