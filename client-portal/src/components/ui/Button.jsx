export default function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 " +
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--regime-ring)] " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-y-0";
  const variants = {
    // Solid regime color (blue for NRE, pink for NRO -- see
    // applicationState.js's applyRegimeTheme) with a soft glow of the same color.
    primary:
      "bg-[var(--regime-color)] text-white shadow-[0_10px_24px_-10px_var(--regime-color)] " +
      "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_var(--regime-color)] active:translate-y-0",
    outline:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[var(--regime-color)] hover:text-[var(--regime-color)]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
