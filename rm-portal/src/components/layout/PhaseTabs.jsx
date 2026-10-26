// Purely visual sub-progress indicator for a merged step that groups
// several of the original single-purpose pages behind one URL.
export default function PhaseTabs({ phases, activeIndex }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {phases.map((label, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                isActive
                  ? "bg-[var(--regime-color)] text-white"
                  : isDone
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isActive ? "bg-white/25" : isDone ? "bg-emerald-100" : "bg-slate-200"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              {label}
            </span>
            {index < phases.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        );
      })}
    </div>
  );
}
