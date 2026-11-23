export default function Card({ className = "", children }) {
  return <div className={`rounded-3xl border border-slate-100/80 bg-white shadow-soft ${className}`}>{children}</div>;
}
