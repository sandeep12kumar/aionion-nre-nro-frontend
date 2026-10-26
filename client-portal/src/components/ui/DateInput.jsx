import { useEffect, useRef, useState } from "react";

export function toDisplayDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[3] + "/" + match[2] + "/" + match[1] : "";
}

export function formatTypedDate(value, deleting = false) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  let formatted = digits.slice(0, 2);
  if (digits.length >= 2) formatted += "/" + digits.slice(2, 4);
  if (digits.length >= 4) formatted += "/" + digits.slice(4);
  return deleting ? formatted.replace(/\/$/, "") : formatted;
}

export function toIsoDate(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (Number(year) < 1 || date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return "";
  return year + "-" + month.padStart(2, "0") + "-" + day.padStart(2, "0");
}

export default function DateInput({ value, onChange, className, min, max, onBlur, ...props }) {
  const [display, setDisplay] = useState(() => toDisplayDate(value));
  const lastEmitted = useRef(value);
  const textRef = useRef(null);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDisplay(toDisplayDate(value));
      textRef.current?.setCustomValidity("");
    }
  }, [value]);
  const emit = (iso) => {
    lastEmitted.current = iso;
    onChange?.({ target: { value: iso, name: props.name }, currentTarget: { value: iso, name: props.name } });
  };
  return (
    <div className="relative">
      <input {...props} ref={textRef} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10}
        className={className + " pr-12"} value={display}
        onChange={(event) => {
          const deleting = event.nativeEvent.inputType?.startsWith("delete") || event.target.value.length < display.length;
          const text = formatTypedDate(event.target.value, deleting);
          setDisplay(text);
          const iso = toIsoDate(text);
          const valid = iso && (!min || iso >= min) && (!max || iso <= max);
          event.target.setCustomValidity(text && !valid ? "Enter a valid date as dd/mm/yyyy within the allowed range." : "");
          emit(valid ? iso : "");
        }}
        onBlur={(event) => {
          const iso = toIsoDate(display);
          if (iso && ((!min || iso >= min) && (!max || iso <= max))) {
            setDisplay(toDisplayDate(iso));
          } else if (iso) {
            setDisplay("");
            textRef.current?.setCustomValidity("");
          }
          onBlur?.(event);
        }}
      />
      <span className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
        <input type="date" aria-label="Choose date from calendar" tabIndex={-1} className="absolute inset-0 w-full cursor-pointer opacity-0" value={value || ""} min={min} max={max} disabled={props.disabled || props.readOnly}
          onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch {} }}
          onChange={(event) => {
            const iso = event.target.value;
            const valid = iso && (!min || iso >= min) && (!max || iso <= max);
            setDisplay(valid ? toDisplayDate(iso) : "");
            textRef.current?.setCustomValidity("");
            emit(valid ? iso : "");
          }} />
      </span>
    </div>
  );
}
