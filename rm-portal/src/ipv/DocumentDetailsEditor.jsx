import { useEffect, useState } from "react";
import { Button } from "./ipvUi";

export default function DocumentDetailsEditor({ type, value, reading, warning, onSave, onEditing }) {
  const [draft, setDraft] = useState({ number: "", name: "", date: "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setDraft({ number: value?.number || "", name: value?.name || "", date: value?.date || "" });
    setNotice("");
    setEditing(false);
  }, [value]);
  const passport = type === "passport_front";
  const fields = [["number", passport ? "Passport number" : "PAN number"], ["name", "Name"], ["date", passport ? "Expiry date" : "Date of birth"]];
  const close = () => { setEditing(false); onEditing(false); };
  const save = async () => {
    setSaving(true);
    try { if (await onSave(draft)) { close(); setNotice("Values saved."); } }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-700">OCR values — review and correct</p>
      {reading && <p className="text-xs text-slate-500" role="status">Reading the saved image...</p>}
      {warning && <p className="text-xs text-amber-700" role="status">{warning}</p>}
      {fields.map(([key, label]) => (
        <label key={key} className="block text-xs font-medium text-slate-600" htmlFor={type + "-" + key}>
          {label}
          <input id={type + "-" + key} type={key === "date" ? "date" : "text"} value={draft[key]} readOnly={!editing} disabled={reading || saving}
            maxLength={key === "name" ? 150 : passport ? 20 : 10}
            onChange={(event) => setDraft(current => ({ ...current, [key]: event.target.value }))}
            className="mt-1 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 read-only:bg-slate-100 disabled:opacity-60" />
        </label>
      ))}
      <div className="flex flex-wrap gap-2">
        {editing ? <>
          <Button small disabled={reading || saving} onClick={save}>{saving ? "Saving values..." : "Save edited values"}</Button>
          <Button small variant="outline" disabled={saving} onClick={() => { setDraft({ number: value?.number || "", name: value?.name || "", date: value?.date || "" }); close(); }}>Cancel</Button>
        </> : <Button small variant="outline" disabled={reading} onClick={() => { setEditing(true); setNotice(""); onEditing(true); }}>Edit values</Button>}
      </div>
      {notice && <p className="text-xs text-emerald-700" role="status">{notice}</p>}
    </div>
  );
}
