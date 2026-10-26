import { useState } from "react";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";

// The only scheme offered -- must match DEFAULT_SCHEME_KEY in server/constants/schemes.js
const SCHEME = { key: "lifeTime", label: "Life Time Advantage", baseAmount: 2499, note: "(No AMC)" };
const GST_RATE = 0.18;

function totalFor(baseAmount) {
  const gst = Math.round(baseAmount * GST_RATE * 100) / 100;
  return { gst, total: Math.round((baseAmount + gst) * 100) / 100 };
}

// Every client gets Life Time Advantage; Continue saves it, and the client
// pays for it later in client-portal.
export default function SchemeSelectStep({ onNext, onBack }) {
  const panNumber = getPanNumber();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { gst, total } = totalFor(SCHEME.baseAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/scheme", { panNumber });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save the scheme.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="flex items-start gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">ACCOUNT OPENING CHARGES</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Client's scheme</h2>
          <p className="mt-1 text-sm text-slate-500">The client will pay for this scheme from the link you send them.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-brand-blue bg-indigo-50/50 p-5 ring-1 ring-brand-blue">
          <p className="text-xs font-semibold tracking-wide text-pink-500">SCHEME</p>
          <p className="mt-1 text-base font-bold text-slate-900">{SCHEME.label}</p>
          <p className="mt-2 text-2xl font-bold text-brand-blue">
            ₹{SCHEME.baseAmount} <span className="text-sm font-medium text-slate-400">+ GST</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{SCHEME.note}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Base amount</span>
            <span className="font-medium text-slate-800">₹{SCHEME.baseAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">GST (18%)</span>
            <span className="font-medium text-slate-800">₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
            <span className="font-semibold text-slate-800">Total payable by client</span>
            <span className="font-bold text-brand-blue">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <StepFooter onBack={onBack} submitLabel="Continue" loading={loading} />
      </form>
    </Card>
  );
}
