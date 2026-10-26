export default function CapturePrompt({ title, subtitle, fileName, onOpenCamera }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-lg text-brand-blue">📷</div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{fileName || subtitle}</p>
      <button type="button" onClick={onOpenCamera} className="mt-4 rounded-lg bg-brand-blue px-5 py-2 text-xs font-semibold text-white">
        Open Camera
      </button>
    </div>
  );
}
