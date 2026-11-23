// onView: when given, a "View document" button opens the chosen / stored file.
export default function UploadDropzone({ title, subtitle, fileName, uploading, disabled, onChange, onRemove, onView }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--regime-color)_30%,white)] bg-[color:color-mix(in_srgb,var(--regime-color)_4%,white)] px-6 py-8 text-center transition hover:border-[var(--regime-color)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg text-[var(--regime-color)] shadow-sm ring-1 ring-slate-100">
        {uploading ? "…" : "⬆"}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{fileName || subtitle}</p>
      <label className="mt-4 inline-block cursor-pointer rounded-xl bg-[var(--regime-color)] px-5 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_-8px_var(--regime-color)] transition hover:-translate-y-0.5">
        {uploading ? "Uploading…" : "Browse File"}
        <input type="file" accept="image/*,application/pdf" hidden disabled={disabled} onChange={onChange} />
      </label>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="ml-3 text-xs font-semibold text-[var(--regime-color)] hover:underline"
        >
          View document
        </button>
      )}
      {fileName && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="ml-3 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          Remove document
        </button>
      )}
    </div>
  );
}
