const TONES = {
  regime: "bg-[var(--regime-soft)] text-[var(--regime-color)] ring-[color:color-mix(in_srgb,var(--regime-color)_20%,white)]",
  blue: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  grey: "bg-slate-100 text-slate-600 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

export default function Badge({ tone = "grey", children }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}
