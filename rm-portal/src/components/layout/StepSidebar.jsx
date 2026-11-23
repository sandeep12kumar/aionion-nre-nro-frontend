import { useNavigate } from "react-router-dom";
import { STEPS, stepIndex, stepPath } from "../../steps/stepsConfig";
import { IdCardIcon, BankIcon, UsersIcon, CardIcon, UserIcon, GlobeIcon, DocumentIcon, CameraIcon } from "../ui/icons";

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

// Completed steps are links, so the RM can go back and correct one (e.g. the
// NRE / NRO choice) without stepping back page by page.
export default function StepSidebar({ currentStepId }) {
  const navigate = useNavigate();
  const currentIndex = stepIndex(currentStepId);

  return (
    <div className="w-full max-w-xs shrink-0 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-pink-500">CLIENT APPLICATION</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Account opening steps</h2>

        <ol className="mt-5 space-y-2">
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            const Icon = STEP_ICONS[step.id] || DocumentIcon;

            return (
              <li
                key={step.id}
                role={isDone ? "link" : undefined}
                tabIndex={isDone ? 0 : undefined}
                title={isDone ? `Go back to ${step.title}` : undefined}
                onClick={isDone ? () => navigate(stepPath(step)) : undefined}
                onKeyDown={isDone ? (e) => { if (e.key === "Enter") navigate(stepPath(step)); } : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? "bg-[var(--regime-color)] text-white"
                    : isDone
                      ? "cursor-pointer bg-emerald-50 hover:bg-emerald-100"
                      : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-white text-white"
                      : isDone
                        ? "border-emerald-500 bg-white text-emerald-600"
                        : "border-slate-300 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? "text-white" : isDone ? "text-emerald-700" : "text-slate-700"}`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${isActive ? "text-white/80" : "text-slate-400"}`}>{step.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-900"></p>
        <p className="mt-1 text-xs text-indigo-700">Encrypted in transit and used only for regulatory verification.</p>
      </div> */}
    </div>
  );
}
