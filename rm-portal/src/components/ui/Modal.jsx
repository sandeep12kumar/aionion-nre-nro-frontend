export default function Modal({ open, title, children, footer, size = "md" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`w-full ${size === "lg" ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-white p-6 shadow-xl`}>
        {title && <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>}
        <div className="max-h-[70vh] overflow-y-auto text-sm text-slate-600">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
