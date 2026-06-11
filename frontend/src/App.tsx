import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ServerCrash } from "lucide-react";

import { getMetadata, predictRisk, RiskApiError } from "./api/riskApi";
import { ClinicalSuggestions } from "./components/ClinicalSuggestions";
import { ExplanationChart } from "./components/ExplanationChart";
import { ModelTransparency } from "./components/ModelTransparency";
import { PatientInputPanel } from "./components/PatientInputPanel";
import { RiskSummary } from "./components/RiskSummary";
import type { ModelMetadata, RiskAssessmentRequest, RiskAssessmentResponse } from "./types/risk";

const samplePatient: RiskAssessmentRequest = {
  patient_id: "SIM-10492",
  age: 65,
  gender: "female",
  hba1c_category: "greater_8",
  number_medications: 14,
  prior_inpatient_visits: 2,
  prior_emergency_visits: 1,
  metformin_status: "steady",
  insulin_status: "up",
  discharge_disposition: "home",
};

function App() {
  const [form, setForm] = useState<RiskAssessmentRequest>(samplePatient);
  const [result, setResult] = useState<RiskAssessmentResponse>();
  const [metadata, setMetadata] = useState<ModelMetadata>();
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const activeMetadata = result?.metadata ?? metadata;

  const scenarioLabel = useMemo(() => {
    if (!whatIfMode) {
      return "EHR-aligned assessment";
    }
    return "What-if scenario";
  }, [whatIfMode]);

  useEffect(() => {
    getMetadata()
      .then((payload) => {
        setMetadata(payload);
        setBackendUnavailable(false);
      })
      .catch((caught: unknown) => {
        setBackendUnavailable(caught instanceof RiskApiError);
      });
  }, []);

  useEffect(() => {
    void runInference();
  }, []);

  function updateForm<K extends keyof RiskAssessmentRequest>(key: K, value: RiskAssessmentRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runInference() {
    setLoading(true);
    setError(undefined);
    setBackendUnavailable(false);
    try {
      const response = await predictRisk(form);
      setResult(response);
      setMetadata(response.metadata);
    } catch (caught) {
      if (caught instanceof RiskApiError) {
        setError(caught.message);
        setBackendUnavailable(!caught.status);
      } else {
        setError("Unexpected inference error.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[390px_minmax(0,1fr)]">
        <PatientInputPanel
          form={form}
          whatIfMode={whatIfMode}
          loading={loading}
          onChange={updateForm}
          onToggleWhatIf={() => setWhatIfMode((enabled) => !enabled)}
          onSubmit={() => void runInference()}
        />

        <section className="min-w-0 px-5 py-5 lg:px-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current context</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{scenarioLabel}</h2>
            </div>
            <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-panel">
              Patient <span className="font-semibold text-slate-900">{form.patient_id || "Unassigned"}</span>
            </div>
          </div>

          {backendUnavailable ? (
            <div className="mb-5 flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <ServerCrash size={18} className="mt-0.5 shrink-0" />
              <p>Backend unavailable. Start FastAPI on port 8000, then rerun inference.</p>
            </div>
          ) : null}

          {error && !backendUnavailable ? (
            <div className="mb-5 flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
            <div className="space-y-5">
              <RiskSummary result={result} loading={loading} />
              <ClinicalSuggestions suggestions={result?.suggestions ?? []} />
              <ModelTransparency metadata={activeMetadata} />
            </div>
            <ExplanationChart contributions={result?.shap_values ?? []} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
