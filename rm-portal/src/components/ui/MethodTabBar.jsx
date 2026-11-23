export default function MethodTabBar({ methods, active, onChange }) {
  return (
    <div className="flex rounded-2xl bg-slate-100/80 p-1 text-sm font-semibold ring-1 ring-slate-200/60">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange(method.id)}
          className={`flex-1 rounded-xl px-3 py-2 transition ${
            active === method.id ? "bg-white text-[var(--regime-color)] shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
