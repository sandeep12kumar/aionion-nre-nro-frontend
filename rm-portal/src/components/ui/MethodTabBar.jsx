export default function MethodTabBar({ methods, active, onChange }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange(method.id)}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            active === method.id ? "bg-brand-blue text-white shadow-sm" : "text-slate-500"
          }`}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
