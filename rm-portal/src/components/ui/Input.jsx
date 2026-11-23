import DateInput from "./DateInput";
export default function Input({ label, error, required, helperText, suffix, className = "", ...props }) {
  const Field = props.type === "date" ? DateInput : "input";
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-pink-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Field
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--regime-color)] disabled:bg-slate-50 read-only:bg-slate-50 ${
            suffix ? "pr-16" : ""
          } ${error ? "border-red-400" : "border-slate-200"}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-[var(--regime-soft)] px-2.5 py-1 text-xs font-bold text-[var(--regime-color)]">
            {suffix}
          </span>
        )}
      </div>
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
