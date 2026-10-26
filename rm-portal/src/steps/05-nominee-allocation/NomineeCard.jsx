import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const RELATIONS = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"];
const GUARDIAN_RELATIONS = ["Father", "Mother", "Grandfather", "Grandmother", "Brother", "Sister", "Other"];

function ageFromDob(dob) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob || "")) return null;
  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function NomineeCard({ index, nominee, onChange, onRemove, canRemove, allocationLocked }) {
  const update = (key) => (e) => onChange(index, { ...nominee, [key]: e.target.value });
  const age = ageFromDob(nominee.dob);
  const today = new Date();
  const maxDob = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const guardianCutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const maxGuardianDob = `${guardianCutoff.getFullYear()}-${String(guardianCutoff.getMonth() + 1).padStart(2, "0")}-${String(guardianCutoff.getDate()).padStart(2, "0")}`;
  const validGuardianDob = nominee.guardianDob && nominee.guardianDob <= maxGuardianDob ? nominee.guardianDob : "";
  const guardianAge = ageFromDob(validGuardianDob);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Nominee {index + 1}</p>
        {canRemove && (
          <button type="button" className="text-xs font-semibold text-red-500" onClick={() => onRemove(index)}>
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Relation" required options={RELATIONS} value={nominee.relation} onChange={update("relation")} />
        <Input label="Nominee name" required value={nominee.nomineeName} onChange={update("nomineeName")} />
        <Input label="Date of birth" required type="date" max={maxDob} value={nominee.dob} onChange={update("dob")} />
        <Input
          label={allocationLocked ? "Allocation % (auto-split)" : "Allocation %"}
          required type="number" min="1" max="100" readOnly={allocationLocked}
          className={allocationLocked ? "opacity-70" : ""}
          value={nominee.allocationPercentage} onChange={update("allocationPercentage")}
        />
        <Input label="Mobile number" required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10}
          value={nominee.mobile || ""} onChange={(e) => onChange(index, { ...nominee, mobile: e.target.value.replace(/\D/g, "") })} />
        <Input label="Email" required type="email" autoComplete="off" value={nominee.email || ""} onChange={update("email")} />
      </div>
      {age !== null && (
        <p className={`mt-4 text-sm ${age < 18 ? "font-semibold text-amber-700" : "text-slate-500"}`}>
          Age: {age} years{age < 18 ? " — minor, guardian details required below" : ""}
        </p>
      )}
      {age !== null && age < 18 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-4 text-sm font-bold uppercase text-amber-800">Guardian details (nominee is a minor)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Guardian relation" required options={GUARDIAN_RELATIONS} value={nominee.guardianRelation || ""} onChange={update("guardianRelation")} />
            <Input label="Guardian name" required value={nominee.guardianName || ""}
              onChange={(e) => onChange(index, { ...nominee, guardianName: e.target.value.replace(/[^\p{L}\s]/gu, "") })} />
            <Input label="Guardian mobile" required type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10}
              value={nominee.guardianMobile || ""} onChange={(e) => onChange(index, { ...nominee, guardianMobile: e.target.value.replace(/\D/g, "") })} />
            <div>
              <Input label="Guardian date of birth" required type="date" max={maxGuardianDob}
                value={validGuardianDob}
                onChange={(e) => onChange(index, { ...nominee, guardianDob: e.target.value <= maxGuardianDob ? e.target.value : "" })} />
              {guardianAge !== null && <p className={`mt-1 text-xs ${guardianAge < 18 ? "text-red-500" : "text-slate-500"}`}>
                Age: {guardianAge} years{guardianAge < 18 ? " — guardian must be at least 18" : ""}
              </p>}
            </div>
            <Input label="Guardian address" required className="sm:col-span-2" value={nominee.guardianAddress || ""} onChange={update("guardianAddress")} />
          </div>
        </div>
      )}
    </Card>
  );
}
