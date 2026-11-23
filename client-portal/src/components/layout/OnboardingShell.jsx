import { useParams } from "react-router-dom";
import logo from "../../assets/aionion-logo.png";
import StepSidebar from "./StepSidebar";
import MobileStepNav from "./MobileStepNav";
import { getSteps, progressPercent, stepIndex } from "../../steps/stepsConfig";
import { LockIcon } from "../ui/icons";

// Every client page: header, the progress band, the step timeline
// (desktop) / step bar (mobile), the page, and a small footer.
// eslint-disable-next-line no-unused-vars
export default function OnboardingShell({ currentStepId, kraBranch, children }) {
  const STEPS = getSteps();
  const { regime } = useParams();
  const accountType = regime?.toUpperCase();
  const percent = progressPercent(currentStepId);
  const stepNumber = Math.max(stepIndex(currentStepId), 0) + 1;

  return (
    <div className="app-bg flex min-h-screen flex-col">
      <div className="brand-strip" />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-md lg:px-8">
        <img src={logo} alt="Aionion Capital" className="h-9 lg:h-11" />
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Secure application
        </span>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200/60 bg-white/60 px-4 pb-5 pt-5 backdrop-blur-sm lg:px-8 lg:pb-7 lg:pt-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--regime-color)] opacity-[0.07] blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--regime-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--regime-color)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--regime-color)]" />
            NRI onboarding{accountType === "NRE" || accountType === "NRO" ? ` · ${accountType}` : ""}
          </span>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-[1.75rem]">Complete your account opening</h1>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-extrabold leading-none text-[var(--regime-color)] lg:text-3xl">{percent}%</p>
              <p className="mt-1 hidden text-xs font-medium text-slate-400 lg:block">
                Step {stepNumber} of {STEPS.length}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full shadow-[0_0_12px_var(--regime-color)] transition-all duration-500"
              style={{
                width: `${percent}%`,
                backgroundImage: "linear-gradient(90deg, color-mix(in srgb, var(--regime-color) 70%, white), var(--regime-color))",
              }}
            />
          </div>
        </div>
      </section>

      <MobileStepNav currentStepId={currentStepId} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="hidden lg:block">
            <StepSidebar currentStepId={currentStepId} />
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Secure &amp; encrypted · Aionion Capital — Research | Trust | Forever
        </span>
      </footer>
    </div>
  );
}
