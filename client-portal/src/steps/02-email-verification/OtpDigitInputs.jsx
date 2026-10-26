import { useRef } from "react";

export default function OtpDigitInputs({ value, onChange, length = 6 }) {
  const inputRefs = useRef([]);

  const setDigit = (index, digit) => {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index) => (e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index) => (e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(length, ""));
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          value={value[index] || ""}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          inputMode="numeric"
          maxLength={1}
          className="h-14 w-12 rounded-xl border border-slate-200 text-center text-xl font-bold text-brand-blue outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />
      ))}
    </div>
  );
}
