import Button from "../ui/Button";

export default function StepFooter({ onBack, submitLabel, loading, disabled }) {
  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="order-1 text-center text-xs text-slate-400 sm:order-2">✓ Progress saved</p>
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
