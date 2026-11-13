import { forwardRef, useEffect, useRef } from "react";
import logo from "../assets/aionion-logo.png";

export function Header({ title, subtitle, right }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <img src={logo} alt="Aionion Capital" className="h-9 shrink-0 lg:h-10" />
        {title && (
          <div className="min-w-0 border-l border-slate-200 pl-4">
            <p className="truncate text-base font-bold text-slate-900">{title}</p>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
        )}
      </div>
      {right}
    </header>
  );
}

export function Button({ variant = "primary", small = false, className = "", children, ...props }) {
  const size = small ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm";
  const variants = {
    primary: "bg-brand-blue text-white hover:opacity-90",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    dark: "bg-slate-700 text-white hover:bg-slate-600",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${size} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{message}</p>;
}

export const formatTime = (value) => (value
  ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  : "-");

// A <video> showing a MediaStream.
export const VideoTile = forwardRef(function VideoTile({ stream, muted = false, mirrored = false, label, className = "" }, ref) {
  const own = useRef(null);
  const video = ref || own;
  useEffect(() => {
    const el = video.current;
    if (el && el.srcObject !== stream) el.srcObject = stream || null;
  }, [stream, video]);
  return (
    <video
      ref={video}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
      className={`bg-slate-900 object-cover ${mirrored ? "-scale-x-100" : ""} ${className}`}
    />
  );
});

// Elapsed time since `since`, as mm:ss.
export function useElapsed(since) {
  const ref = useRef(null);
  useEffect(() => {
    if (!since) return undefined;
    const tick = () => {
      if (!ref.current) return;
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
      ref.current.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [since]);
  return ref;
}
