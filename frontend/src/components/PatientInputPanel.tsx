import { Activity, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

import type { DischargeDisposition, Gender, Hba1cCategory, MedicationStatus, RiskAssessmentRequest } from "../types/risk";
import { FieldLabel } from "./FieldLabel";
import { SelectField } from "./SelectField";
import { SliderField } from "./SliderField";

interface PatientInputPanelProps {
  form: RiskAssessmentRequest;
  whatIfMode: boolean;
  loading: boolean;
  onChange: <K extends keyof RiskAssessmentRequest>(key: K, value: RiskAssessmentRequest[K]) => void;
  onToggleWhatIf: () => void;
  onSubmit: () => void;
}

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

const hba1cOptions: { value: Hba1cCategory; label: string }[] = [
  { value: "none", label: "Not measured" },
  { value: "normal", label: "Normal" },
  { value: "greater_7", label: "> 7%" },
  { value: "greater_8", label: "> 8%" },
];

const medicationOptions: { value: MedicationStatus; label: string }[] = [
  { value: "no", label: "No" },
  { value: "steady", label: "Steady" },
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
];

const dispositionOptions: { value: DischargeDisposition; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "transferred", label: "Transferred" },
  { value: "skilled_nursing", label: "Skilled nursing" },
  { value: "other", label: "Other" },
];

export function PatientInputPanel({ form, whatIfMode, loading, onChange, onToggleWhatIf, onSubmit }: PatientInputPanelProps) {
  return (
    <section className="border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Physician Inputs</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Clinical Risk Workstation</h1>
          </div>
          <button
            type="button"
            onClick={onToggleWhatIf}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded border px-3 text-sm font-medium transition ${
              whatIfMode
                ? "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
            aria-pressed={whatIfMode}
            title={whatIfMode ? "What-if mode active" : "Enable what-if mode"}
          >
            {whatIfMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            <span>{whatIfMode ? "What-if on" : "What-if"}</span>
          </button>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="patient_id" label="Patient ID" />
          <input
            id="patient_id"
            value={form.patient_id}
            onChange={(event) => onChange("patient_id", event.target.value)}
            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-panel outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <SliderField id="age" label="Age" min={18} max={100} value={form.age} onChange={(value) => onChange("age", value)} unit="years" />
        <SelectField id="gender" label="Gender" value={form.gender} options={genderOptions} onChange={(value) => onChange("gender", value)} />
        <SelectField id="hba1c" label="HbA1c" value={form.hba1c_category} options={hba1cOptions} onChange={(value) => onChange("hba1c_category", value)} />
        <SliderField id="medications" label="Medication count" min={0} max={80} value={form.number_medications} onChange={(value) => onChange("number_medications", value)} />
        <SliderField id="inpatient" label="Prior inpatient visits" min={0} max={20} value={form.prior_inpatient_visits} onChange={(value) => onChange("prior_inpatient_visits", value)} />
        <SliderField id="emergency" label="Prior emergency visits" min={0} max={20} value={form.prior_emergency_visits} onChange={(value) => onChange("prior_emergency_visits", value)} />
        <SelectField id="metformin" label="Metformin status" value={form.metformin_status} options={medicationOptions} onChange={(value) => onChange("metformin_status", value)} />
        <SelectField id="insulin" label="Insulin status" value={form.insulin_status} options={medicationOptions} onChange={(value) => onChange("insulin_status", value)} />
        <SelectField id="disposition" label="Discharge disposition" value={form.discharge_disposition} options={dispositionOptions} onChange={(value) => onChange("discharge_disposition", value)} />

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <Activity size={18} />}
          <span>{loading ? "Running inference" : "Run inference"}</span>
        </button>
      </div>
    </section>
  );
}
