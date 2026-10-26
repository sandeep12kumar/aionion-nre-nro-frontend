import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

const PAD_HEIGHT = 180;

// Draw-your-signature canvas (mouse + touch), then uploads the drawing as a
// PNG through the same /documents/upload endpoint as a regular file upload.
export default function SignaturePad({ panNumber, documentType = "signature", onUploaded }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Canvas pixel dimensions must match its displayed CSS size 1:1, or
  // strokes drawn at pointer coordinates end up scaled/misaligned.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = PAD_HEIGHT;
  }, []);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const point = getPoint(e);
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
    setHasDrawn(true);
    setSaved(false);
  };

  const stopDraw = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSaved(false);
    setError("");
  };

  const save = () => {
    if (!hasDrawn) {
      setError("Please draw your signature first.");
      return;
    }
    setError("");
    setUploading(true);
    canvasRef.current.toBlob(async (blob) => {
      try {
        const file = new File([blob], `signature_${Date.now()}.png`, { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("panNumber", panNumber);
        formData.append("documentType", documentType);
        const { data } = await api.post("/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSaved(true);
        onUploaded?.(data.document);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save signature.");
      } finally {
        setUploading(false);
      }
    }, "image/png");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-lg border border-dashed border-slate-300 bg-white"
        style={{ height: PAD_HEIGHT }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={clear} className="text-xs font-semibold text-slate-500">
          Clear
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-600">✓ Signature saved</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            type="button"
            onClick={save}
            disabled={uploading}
            className="rounded-lg bg-[var(--regime-color)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {uploading ? "Saving…" : "Save signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
