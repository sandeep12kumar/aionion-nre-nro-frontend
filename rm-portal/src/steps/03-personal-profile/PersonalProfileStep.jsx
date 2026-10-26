import { DocumentIcon } from "../../components/ui/icons";
import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StepFooter from "../../components/layout/StepFooter";
import api from "../../services/api";
import { getPanNumber, getPrefillEmail } from "../../services/applicationState";
import { COUNTRIES } from "./countries";
import { DIAL_CODES } from "./dialCodes";

const GENDERS = ["Male", "Female", "Other"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];
// must match OCCUPATIONS in server/controllers/personalDetailsController.js
const OCCUPATIONS = [
  "Private Sector", "Public Sector", "Government Service", "Business", "Professional",
  "Agriculturist", "Retired", "Housewife", "Student", "Others",
];
const INCOME_BRACKETS = [
  "Less Than One Lakhs",
  "One To Five Lakhs",
  "Five To Ten Lakhs",
  "Ten To TwentyFive Lakhs",
  "Above TwentyFive Lakhs",
];
const TRADING_EXPERIENCES = ["Less than 1 Year", "1-2 years", "2-5 years", "5-10 years", "10-20 years", "More than 20 years"];

const sanitizeNameValue = (value) => String(value || "").replace(/[0-9]/g, "");
const sanitizeTinValue = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);
const sanitizePhoneValue = (value) => String(value || "").replace(/\D/g, "");

// Pre-selected per Aionion's standard recommendation -- the applicant can
// still change any of these before confirming.
const DEFAULT_STANDING_INSTRUCTIONS = {
  depositoryCredit: "Yes",
  pledgeInstructions: "Yes",
  accountStatementRequirement: "Monthly",
  electronicTransactionStatement: "Yes",
  shareEmailWithRta: "Yes",
  annualReport: "Electronic",
  dividendInterestEcs: "Yes",
  contractNote: "Electronic",
  trustFacility: "No",
  disAtAccountOpening: "No",
};

const STANDING_INSTRUCTION_QUESTIONS = [
  {
    key: "depositoryCredit",
    label: "I/We instruct the DP to receive each and every Depository credit in my/our account.",
    options: ["Yes", "No"],
  },
  {
    key: "pledgeInstructions",
    label:
      "I/We would like to instruct the DP to accept all the pledge instructions in my/our account without any further instruction from my end.",
    options: ["Yes", "No"],
  },
  {
    key: "accountStatementRequirement",
    label: "Account Statement Requirement (as per SEBI Regulation)",
    options: ["Daily", "Weekly", "Fortnightly", "Monthly"],
  },
  {
    key: "electronicTransactionStatement",
    label: "I/We request you to send Electronic Transaction-cum-Holding Statement to the email ID.",
    options: ["Yes", "No"],
  },
  { key: "shareEmailWithRta", label: "I/We would like to share the email ID with RTA.", options: ["Yes", "No"] },
  {
    key: "annualReport",
    label: "I/We would like to receive the Annual Report.",
    options: ["Physical", "Electronic", "Both Physical and Electronic"],
  },
  {
    key: "dividendInterestEcs",
    label: "I/We wish to receive dividend/interest directly into my/our account as given below through ECS.",
    options: ["Yes", "No"],
  },
  { key: "contractNote", label: "Whether you wish to receive contract note through.", options: ["Physical", "Electronic"] },
  {
    key: "trustFacility",
    label: "I/We wish to avail the TRUST facility using the Mobile number registered for SMS Alert Facility.",
    options: ["Yes", "No"],
  },
  {
    key: "disAtAccountOpening",
    label: "Whether you wish to receive DIS at the time of account opening.",
    options: ["Yes", "No"],
  },
];

function StandingInstructionQuestion({ question, value, error, onChange }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-sm text-slate-700">{question.label}</p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {question.options.map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="radio"
              name={question.key}
              checked={value === option}
              onChange={() => onChange(question.key, option)}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PersonalProfileStep({ onNext, onBack }) {
  const panNumber = getPanNumber();

  const [form, setForm] = useState({
    fullName: "",
    fatherSpouseName: "",
    motherName: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    countryOfBirth: "",
    citizenship: "",
    countryOfResidence: "",
    taxIdentificationNumber: "",
    phoneCountryCode: DIAL_CODES[0],
    phoneNumber: "",
    email: "",
    annualIncome: "",
    netWorth: "",
    tradingExperience: "",
  });
  const [prefilled, setPrefilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showStandingPopup, setShowStandingPopup] = useState(false);
  const [standingInstructions, setStandingInstructions] = useState(DEFAULT_STANDING_INSTRUCTIONS);
  const [standingErrors, setStandingErrors] = useState({});
  const [standingCompleted, setStandingCompleted] = useState(false);
  const [mainFormError, setMainFormError] = useState("");

  // "Full name as per PAN" = the name on the PAN from the Income Tax check
  // (itr_full_name), not the Aadhaar name; gender from Aadhaar (DigiLocker);
  // email as saved earlier, else DigiLocker's email.
  useEffect(() => {
    if (!panNumber) return;
    api.get(`/identity/${panNumber}`).then(({ data }) => {
      const identity = data.identity;
      const email = identity?.email || getPrefillEmail();
      if (!identity?.itr_full_name && !identity?.gender && !email) return;
      setForm((f) => ({
        ...f,
        fullName: identity?.itr_full_name || f.fullName,
        gender: identity?.gender || f.gender,
        email: f.email || email,
      }));
      setPrefilled(true);
    });
  }, [panNumber]);

  const update = (key) => (e) => {
    const value =
      key === "motherName" || key === "fatherSpouseName"
        ? sanitizeNameValue(e.target.value)
        : key === "taxIdentificationNumber"
          ? sanitizeTinValue(e.target.value)
          : key === "phoneNumber"
            ? sanitizePhoneValue(e.target.value)
          : key === "email"
            ? e.target.value.trim().toUpperCase() // emails are kept in UPPERCASE everywhere
          : e.target.value;
    setForm({ ...form, [key]: value });
  };

  const updateStandingInstruction = (key, value) => {
    setStandingInstructions((prev) => ({ ...prev, [key]: value }));
    setStandingCompleted(false);
    setMainFormError("");
    setStandingErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateStandingInstructions = () => {
    const nextErrors = {};
    for (const question of STANDING_INSTRUCTION_QUESTIONS) {
      if (!standingInstructions[question.key]) {
        nextErrors[question.key] = "Please select an option.";
      }
    }
    setStandingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleStandingSubmit = () => {
    if (!validateStandingInstructions()) return;
    setStandingCompleted(true);
    setShowStandingPopup(false);
    setMainFormError("");
  };

  const handleStandingClear = () => {
    setStandingInstructions(DEFAULT_STANDING_INSTRUCTIONS);
    setStandingErrors({});
    setStandingCompleted(false);
    setMainFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMainFormError("");

    if (
      !form.fullName ||
      !form.fatherSpouseName ||
      !form.motherName ||
      !form.gender ||
      !form.maritalStatus ||
      !form.occupation ||
      !form.annualIncome ||
      !form.netWorth ||
      !form.tradingExperience
    ) {
      setError("Please complete all required personal information fields.");
      return;
    }
    if (!form.countryOfBirth || !form.citizenship || !form.countryOfResidence || !form.taxIdentificationNumber) {
      setError("Please complete all required tax residency fields.");
      return;
    }
    if (!form.phoneCountryCode || !form.phoneNumber) {
      setError("Please enter your phone number with country code.");
      return;
    }
    if (!/^\d+$/.test(form.phoneNumber)) {
      setError("Phone number must contain digits only.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    const standingValid = validateStandingInstructions();
    if (!standingValid || !standingCompleted) {
      setStandingCompleted(false);
      setMainFormError(
        standingValid
          ? "Please click Submit in Standing Instructions before submitting the Personal Details form."
          : "Please complete all mandatory Standing Instructions before submitting the Personal Details form.",
      );
      setShowStandingPopup(true);
      return;
    }

    setLoading(true);
    try {
      await api.post("/personal-details", { panNumber, ...form });
      await api.post("/standing-instructions", { panNumber, ...standingInstructions });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save personal details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-pink-500">YOUR PROFILE</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Personal and tax details</h2>
              <p className="mt-1 text-sm text-slate-500">
                {prefilled
                  ? "We've prefilled the details verified on the Identity step. Please review and complete the remaining fields."
                  : "Tell us about yourself to complete your profile."}
              </p>
            </div>
          </div>
          {prefilled && <Badge tone="green">PREFILLED</Badge>}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">PERSONAL INFORMATION</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Full name as per PAN" required value={form.fullName} onChange={update("fullName")} />
              <Input
                label="Father's name/ Spouse name"
                required
                value={form.fatherSpouseName}
                onChange={update("fatherSpouseName")}
              />
              <Input label="Mother's name" required value={form.motherName} onChange={update("motherName")} />
              <Select label="Gender" required options={GENDERS} value={form.gender} onChange={update("gender")} />
              <Select
                label="Marital status"
                required
                options={MARITAL_STATUSES}
                value={form.maritalStatus}
                onChange={update("maritalStatus")}
              />
              <Select
                label="Occupation"
                required
                options={OCCUPATIONS}
                value={form.occupation}
                onChange={update("occupation")}
              />
              <Select
                label="Country of birth"
                required
                options={COUNTRIES}
                value={form.countryOfBirth}
                onChange={update("countryOfBirth")}
              />
              <Select
                label="Citizenship"
                required
                options={COUNTRIES}
                value={form.citizenship}
                onChange={update("citizenship")}
              />
              <Select
                label="Trading experience"
                required
                options={TRADING_EXPERIENCES}
                value={form.tradingExperience}
                onChange={update("tradingExperience")}
              />
              <Select
                label="Annual income"
                required
                options={INCOME_BRACKETS}
                value={form.annualIncome}
                onChange={update("annualIncome")}
              />
              <Select
                label="Net worth"
                required
                options={INCOME_BRACKETS}
                value={form.netWorth}
                onChange={update("netWorth")}
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">TAX RESIDENCY</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Current country of residence"
                required
                options={COUNTRIES}
                value={form.countryOfResidence}
                onChange={update("countryOfResidence")}
              />
              <Input
                label="Tax identification number"
                required
                inputMode="numeric"
                maxLength={11}
                value={form.taxIdentificationNumber}
                onChange={update("taxIdentificationNumber")}
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400">CONTACT DETAILS</p>
            <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-3">
              <Select
                label="Country code"
                required
                options={DIAL_CODES}
                value={form.phoneCountryCode}
                onChange={update("phoneCountryCode")}
              />
              <Input
                label="Phone number"
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.phoneNumber}
                onChange={update("phoneNumber")}
              />
            </div>
            <Input
              className="mt-5"
              label="Email address"
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              helperText="The client confirms this email with a one-time code in their link."
            />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left"
            onClick={() => setShowStandingPopup(true)}
          >
            <div className="flex items-center gap-3">
              <DocumentIcon className="h-5 w-5 shrink-0 text-[var(--regime-color)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Standing Instruction</p>
                <p className="text-xs text-slate-500">Demat account operating preferences (required)</p>
              </div>
            </div>
            <Badge tone={standingCompleted ? "green" : "regime"}>{standingCompleted ? "COMPLETED" : "REQUIRED"}</Badge>
          </button>

          {mainFormError && <p className="text-sm text-red-500">{mainFormError}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter onBack={onBack} submitLabel="Save & continue" loading={loading} />
        </form>
      </Card>

      <Modal
        open={showStandingPopup}
        title="Standing Instructions"
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={handleStandingClear}>
              Clear
            </Button>
            <Button type="button" onClick={handleStandingSubmit}>
              Submit
            </Button>
          </>
        }
      >
        {STANDING_INSTRUCTION_QUESTIONS.map((question) => (
          <StandingInstructionQuestion
            key={question.key}
            question={question}
            value={standingInstructions[question.key]}
            error={standingErrors[question.key]}
            onChange={updateStandingInstruction}
          />
        ))}
      </Modal>
    </>
  );
}
