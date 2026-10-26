import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "../../assets/aionion-logo.png";
import StepSidebar from "./StepSidebar";
import MobileStepNav from "./MobileStepNav";
import { progressPercent } from "../../steps/stepsConfig";
import { getRmEmail, clearSession } from "../../services/applicationState";

export default function OnboardingShell({ currentStepId, kraBranch, children }) {
  const navigate = useNavigate();
  const rmEmail = getRmEmail();
  const { regime } = useParams();
  const accountType = regime?.toUpperCase();
  const percent = progressPercent(currentStepId);
  const [previewBranch, setPreviewBranch] = useState(kraBranch || "not_found");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 lg:px-8 lg:py-4">
        <img src={logo} alt="Aionion Capital" className="h-9 lg:h-11" />
        <div className="flex items-center gap-6 text-sm text-slate-500">
          {rmEmail && (
            <>
              <span className="hidden sm:inline">
                RM: <span className="font-semibold text-slate-700">{rmEmail}</span>
              </span>
              <button
                type="button"
                className="font-semibold text-brand-blue"
                onClick={() => {
                  clearSession();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <div className="border-b border-slate-100 bg-white px-4 pb-4 pt-4 lg:px-8 lg:pb-6 lg:pt-5">
        <p className="text-sm font-semibold tracking-wide text-pink-500">
          NRI ONBOARDING{accountType === "NRE" || accountType === "NRO" ? ` - ${accountType}` : ""}
        </p>
        <div className="mt-1 flex items-end justify-between">
          <h1 className="text-lg font-bold text-slate-900 lg:text-2xl">Complete the client's account opening</h1>
          <p className="text-sm text-slate-500">
            <span className="text-lg font-bold text-[var(--regime-color)] lg:text-xl">{percent}%</span>
            <span className="hidden lg:inline"> completed</span>
          </p>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[var(--regime-color)] transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <MobileStepNav currentStepId={currentStepId} />

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {/* <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <span className="text-sm text-slate-500">ⓘ Preview customer path</span>
          <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPreviewBranch("found")}
              className={`rounded-full px-3 py-1.5 transition ${
                previewBranch === "found" ? "bg-white text-brand-blue shadow-sm" : "text-slate-400"
              }`}
            >
              KRA record found
            </button>
            <button
              type="button"
              onClick={() => setPreviewBranch("not_found")}
              className={`rounded-full px-3 py-1.5 transition ${
                previewBranch === "not_found" ? "bg-white text-brand-blue shadow-sm" : "text-slate-400"
              }`}
            >
              Documents required
            </button>
          </div>
        </div> */}

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="hidden lg:block">
            <StepSidebar currentStepId={currentStepId} />
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
