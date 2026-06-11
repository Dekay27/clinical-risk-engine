import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ShapContribution } from "../types/risk";

interface ExplanationChartProps {
  contributions: ShapContribution[];
}

const featureLabelOverrides: Record<string, string> = {
  "A1Cresult >7": "HbA1c > 7%",
  "A1Cresult >8": "HbA1c > 8%",
  "A1Cresult None": "HbA1c not measured",
  "A1Cresult Norm": "HbA1c normal",
  "admission source id": "Admission source",
  "admission type id": "Admission type",
  "discharge disposition id": "Discharge disposition",
  "metformin No": "Metformin: no",
  "metformin Steady": "Metformin: steady",
  "metformin Up": "Metformin: increased",
  "metformin Down": "Metformin: decreased",
  "number diagnoses": "Number of diagnoses",
  "number emergency": "Prior emergency visits",
  "number inpatient": "Prior inpatient visits",
  "number outpatient": "Prior outpatient visits",
  "num lab procedures": "Lab procedures",
  "num medications": "Medication count",
  "num procedures": "Procedures",
  "time in hospital": "Time in hospital",
};

function clinicianFeatureLabel(feature: string) {
  const normalized = feature.replace(/\s+/g, " ").trim();
  return featureLabelOverrides[normalized] ?? normalized;
}

export function ExplanationChart({ contributions }: ExplanationChartProps) {
  const data = contributions.map((item) => ({
    ...item,
    displayFeature: clinicianFeatureLabel(item.feature),
    label:
      clinicianFeatureLabel(item.feature).length > 26
        ? `${clinicianFeatureLabel(item.feature).slice(0, 25)}...`
        : clinicianFeatureLabel(item.feature),
  }));

  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Explainability</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Local contribution drivers</h2>
        </div>
        <span className="text-xs font-medium text-slate-500">log-odds impact</span>
      </div>

      <div className="mt-4 h-[360px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis dataKey="label" type="category" width={165} tick={{ fill: "#334155", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: 4, borderColor: "#cbd5e1", color: "#1e293b" }}
                formatter={(value, _name, item) => [Number(value).toFixed(4), item.payload.value]}
                labelFormatter={(_, payload) => payload?.[0]?.payload.displayFeature ?? ""}
              />
              <Bar dataKey="impact" radius={[3, 3, 3, 3]}>
                {data.map((entry) => (
                  <Cell key={entry.feature} fill={entry.impact >= 0 ? "#dc2626" : "#059669"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Run inference to view contribution values.
          </div>
        )}
      </div>
    </section>
  );
}
