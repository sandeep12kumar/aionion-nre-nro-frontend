export default function CapturePrompt({ title, subtitle, fileName, onOpenCamera }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--regime-color)_30%,white)] bg-[color:color-mix(in_srgb,var(--regime-color)_4%,white)] px-6 py-8 text-center transition hover:border-[var(--regime-color)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg text-[var(--regime-color)] shadow-sm ring-1 ring-slate-100">📷</div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{fileName || subtitle}</p>
      <button type="button" onClick={onOpenCamera} className="mt-4 rounded-xl bg-[var(--regime-color)] px-5 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_-8px_var(--regime-color)] transition hover:-translate-y-0.5">
        Open Camera
      </button>
    </div>
  );
}
