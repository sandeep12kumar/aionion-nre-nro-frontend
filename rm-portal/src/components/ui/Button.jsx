export default function Button({ variant = "primary", className = "", children, ...props }) {
  const base = "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    // Solid regime color (blue for NRE, pink for NRO -- see
    // applicationState.js's applyRegimeTheme) instead of the neutral
    // gradient, once an account type has been chosen.
    primary: "bg-[var(--regime-color)] text-white hover:opacity-90",
    outline: "border border-slate-200 text-brand-blue hover:bg-slate-50",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
