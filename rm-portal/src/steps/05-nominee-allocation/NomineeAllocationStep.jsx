import { useState } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";
import NomineeCard from "./NomineeCard";

const MAX_NOMINEES = 3;

const emptyNominee = () => ({
  nomineeName: "",
  dob: "",
  relation: "",
  allocationPercentage: "",
  mobile: "",
  email: "",
});

// Equal split with the 100%-remainder handed to the first N nominees, e.g.
// 3 -> 34/33/33, 7 -> 15/15/14/14/14/14/14 -- same rule as the KYC app's
// Nomination.js so a fresh split always sums to exactly 100 regardless of
// how many nominees there are.
function getAutoSplitAllocations(count) {
  const base = Math.floor(100 / count);
  const remainder = 100 % count;
  return Array.from({ length: count }, (_, index) => String(base + (index < remainder ? 1 : 0)));
}

export default function NomineeAllocationStep({ onNext, onBack }) {
  const panNumber = getPanNumber();

  const [nominees, setNominees] = useState([emptyNominee()]);
  const [autoSplitApplied, setAutoSplitApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalAllocation = nominees.reduce((sum, n) => sum + (Number(n.allocationPercentage) || 0), 0);
  const totalOk = Math.round(totalAllocation * 100) / 100 === 100;

  const updateNominee = (index, updated) => {
    setNominees((list) => list.map((n, i) => (i === index ? updated : n)));
    setError("");
  };

  const addNominee = () => {
    if (nominees.length >= MAX_NOMINEES) return;
    setNominees((list) => [...list, emptyNominee()]);
    setAutoSplitApplied(false);
  };

  const removeNominee = (index) => {
    setNominees((list) => list.filter((_, i) => i !== index));
    setAutoSplitApplied(false);
  };

  const applyAutoSplit = () => {
    const allocations = getAutoSplitAllocations(nominees.length);
    setNominees((list) => list.map((n, i) => ({ ...n, allocationPercentage: allocations[i] })));
    setAutoSplitApplied(true);
    setError("");
  };

  // Unlocks the % fields for manual editing -- the auto-split values stay
  // put until the applicant changes them.
  const removeAutoSplit = () => setAutoSplitApplied(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!totalOk) {
      setError(`Total nominee allocation must be exactly 100%. Current total: ${totalAllocation}%`);
      return;
    }

    setLoading(true);
    try {
      await api.post("/nominees", {
        panNumber,
        nominees,
      });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save nominee details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-pink-500">NOMINATION</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Nominee &amp; allocation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add at least one and up to {MAX_NOMINEES} nominees for this account, with a percentage allocation that adds
              up to 100%.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <>
              <div className="space-y-4">
                {nominees.map((nominee, index) => (
                  <NomineeCard
                    key={index}
                    index={index}
                    nominee={nominee}
                    onChange={updateNominee}
                    onRemove={removeNominee}
                    canRemove={nominees.length > 1}
                    allocationLocked={autoSplitApplied}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={addNominee}
                    disabled={nominees.length >= MAX_NOMINEES}
                  >
                    + Add nominee
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-blue"
                    onClick={autoSplitApplied ? removeAutoSplit : applyAutoSplit}
                  >
                    {autoSplitApplied ? "Remove Auto Split" : "Auto Split Equally"}
                  </button>
                </div>
                <Badge tone={totalOk ? "green" : "grey"}>Total allocation: {totalAllocation}%</Badge>
              </div>

              {autoSplitApplied && (
                <p className="text-xs text-emerald-600">
                  ✓ Auto split applied — allocation is locked at exactly 100% across {nominees.length}{" "}
                  {nominees.length === 1 ? "nominee" : "nominees"}.
                </p>
              )}
          </>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter
            onBack={onBack}
            submitLabel="Save & continue"
            loading={loading}
            disabled={!totalOk}
          />
        </form>
      </Card>
    </>
  );
}
