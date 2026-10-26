// onView: when given, a "View document" button opens the chosen / stored file.
export default function UploadDropzone({ title, subtitle, fileName, uploading, disabled, onChange, onRemove, onView }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-lg text-brand-blue">
        {uploading ? "…" : "⬆"}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{fileName || subtitle}</p>
      <label className="mt-4 inline-block cursor-pointer rounded-lg bg-brand-blue px-5 py-2 text-xs font-semibold text-white">
        {uploading ? "Uploading…" : "Browse File"}
        <input type="file" accept="image/*,application/pdf" hidden disabled={disabled} onChange={onChange} />
      </label>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="ml-3 text-xs font-semibold text-brand-blue hover:underline"
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
