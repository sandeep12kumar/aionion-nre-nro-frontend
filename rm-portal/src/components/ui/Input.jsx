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
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-blue focus:ring-1 focus:ring-brand-blue ${
            suffix ? "pr-16" : ""
          } ${error ? "border-red-400" : "border-slate-200"}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-brand-blue">
            {suffix}
          </span>
        )}
      </div>
      {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
