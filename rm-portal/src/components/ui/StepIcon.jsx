// Replaces the old "colorful emoji in a flat indigo badge" header pattern
// used at the top of every step -- an outline icon (see icons.jsx) tinted
// with the chosen regime's flow color (blue for NRE, pink for NRO, see
// applicationState.js's applyRegimeTheme) instead of a fixed neutral tint.
export default function StepIcon({ icon: Icon, size = "md" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconSize = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-[var(--regime-color)]/15 ring-1 ring-inset ring-[var(--regime-color)]/20 shadow-sm`}
    >
      <Icon className={`${iconSize} text-[var(--regime-color)]`} />
    </div>
  );
}
