import { useNavigate } from "react-router-dom";
import { STEPS, stepIndex, stepPath } from "../../steps/stepsConfig";
import { IdCardIcon, BankIcon, UsersIcon, CardIcon, UserIcon, GlobeIcon, DocumentIcon, CameraIcon, CheckIcon } from "../ui/icons";

const STEP_ICONS = {
  ipv: CameraIcon,
  account_type: GlobeIcon,
  aadhaar: UserIcon,
  identity_contact: IdCardIcon,
  bank_proofs: BankIcon,
  address_proofs: DocumentIcon,
  personal_nominee: UsersIcon,
  scheme_link: CardIcon,
};

// The steps as a timeline. Completed steps are links, so the RM can go back
// and correct one (e.g. the NRE / NRO choice) without stepping back page by page.
export default function StepSidebar({ currentStepId }) {
  const navigate = useNavigate();
  const currentIndex = stepIndex(currentStepId);

  return (
    <div className="w-full max-w-xs shrink-0 lg:sticky lg:top-24">
      <div className="rounded-3xl border border-slate-100/80 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-pink">Client application</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Account opening steps</h2>
          </div>
          <span className="mt-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {Math.max(currentIndex, 0)}/{STEPS.length}
          </span>
        </div>

        <ol className="mt-5">
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            const isLast = index === STEPS.length - 1;
            const Icon = STEP_ICONS[step.id] || DocumentIcon;

            return (
              <li key={step.id} className="relative pb-1.5">
                {/* the line joining this step to the next */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[29px] top-12 h-[calc(100%-2.25rem)] w-0.5 rounded-full ${isDone ? "bg-emerald-300" : "bg-slate-200"}`}
                  />
                )}
                <div
                  role={isDone ? "link" : undefined}
                  tabIndex={isDone ? 0 : undefined}
                  title={isDone ? `Go back to ${step.title}` : undefined}
                  onClick={isDone ? () => navigate(stepPath(step)) : undefined}
                  onKeyDown={isDone ? (e) => { if (e.key === "Enter") navigate(stepPath(step)); } : undefined}
                  className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                    isActive
                      ? "bg-[var(--regime-color)] text-white shadow-[0_12px_28px_-12px_var(--regime-color)]"
                      : isDone
                        ? "cursor-pointer hover:bg-emerald-50"
                        : ""
                  }`}
                >
                  <span
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isActive
                        ? "bg-white/20 text-white ring-2 ring-white/50"
                        : isDone
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {isDone ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? "text-white" : isDone ? "text-slate-800" : "text-slate-500"}`}>
                      {step.title}
                    </p>
                    <p className={`truncate text-xs ${isActive ? "text-white/80" : "text-slate-400"}`}>{step.subtitle}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
