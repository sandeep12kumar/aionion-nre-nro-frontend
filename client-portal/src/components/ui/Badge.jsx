const TONES = {
  regime: "bg-[color-mix(in_srgb,var(--regime-color)_10%,white)] text-[var(--regime-color)]",
  blue: "bg-indigo-50 text-indigo-700",
  grey: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-700",
};

export default function Badge({ tone = "grey", children }) {
  return <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
