import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const SEEDING_LABELS = { LINKED: "Linked", "NOT LINKED": "Not linked", NOT_LINKED: "Not linked" };

function formatDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function Rows({ rows }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
      {rows.map(([label, value, note]) => (
        <div key={label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
          <span className="text-slate-500">{label}</span>
          <span className="min-w-0 max-w-[75%] break-words text-right font-medium text-slate-800">
            {String(value ?? "").trim() || "-"}
            {note && <span className={`block text-xs font-normal ${note.tone}`}>{note.text}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

// What the Identity step fetched: the PAN details from the Income Tax
// Department, plus (client with Aadhaar) the Aadhaar details from DigiLocker.
export default function IdentityResultView({ panNumber, itrData, aadhaarData, onContinue, loading = false, error = "" }) {
  // The full Aadhaar address in the usual order, e.g. "1/260, PATTAKKULAM,
  // VILUPPANUR POST, Viluppanur, Srivilliputhur, Virudhunagar, Tamil Nadu - 626138"
  const aadhaarAddress = aadhaarData
    ? [
      aadhaarData.house, aadhaarData.street, aadhaarData.landmark, aadhaarData.locality,
      aadhaarData.villageTownCity, aadhaarData.postOffice, aadhaarData.subDistrict, aadhaarData.district,
      aadhaarData.state,
    ]
      .filter(Boolean)
      // DigiLocker often repeats a place (village = post office, ...)
      .filter((part, i, parts) => parts.findIndex((p) => p.toUpperCase() === part.toUpperCase()) === i)
      .join(", ") + (aadhaarData.pincode ? ` - ${aadhaarData.pincode}` : "")
    : "";
  const warn = "text-amber-700";
  const ok = "text-emerald-700";

  return (
    <div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-pink-500">IDENTITY VERIFIED</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Here's what we found</h2>
        <p className="mt-1 text-sm text-slate-500">
          {aadhaarData
            ? "The PAN is verified with the Income Tax Department and the Aadhaar details are fetched from DigiLocker."
            : "The PAN is verified with the Income Tax Department."}
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold tracking-wide text-slate-400">PAN DETAILS</p>
          <Badge tone="blue">INCOME TAX</Badge>
        </div>
        <Rows
          rows={[
            ["PAN", panNumber, { tone: ok, text: "Valid" }],
            ["Name on PAN", itrData?.fullName],
            ["Category", itrData?.category],
            [
              "Aadhaar linked",
              SEEDING_LABELS[String(itrData?.aadhaarSeedingStatus || "").toUpperCase()] || itrData?.aadhaarSeedingStatus,
            ],
          ]}
        />
      </div>

      {aadhaarData && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-400">AADHAAR DETAILS</p>
            <Badge tone="green">DIGILOCKER</Badge>
          </div>
          <Rows
            rows={[
              [
                "Name",
                aadhaarData.name,
                aadhaarData.nameMatchesPan
                  ? { tone: ok, text: "Matches the name on PAN" }
                  : { tone: warn, text: "Doesn't match the name on PAN" },
              ],
              [
                "Date of birth",
                formatDate(aadhaarData.dateOfBirth),
                aadhaarData.dobMatches === false ? { tone: warn, text: "Doesn't match the date of birth entered" } : null,
              ],
              ["Gender", aadhaarData.gender],
              ["Aadhaar number", aadhaarData.maskedNumber],
              ["Care of", aadhaarData.careOf],
              ["Address", aadhaarAddress],
              ["Sub-district", aadhaarData.subDistrict],
              ["District", aadhaarData.district],
              ["State", aadhaarData.state],
              ["Pin code", aadhaarData.pincode],
              ["Country", aadhaarData.country],
            ]}
          />
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
      <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
        <Button disabled={loading} onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}
