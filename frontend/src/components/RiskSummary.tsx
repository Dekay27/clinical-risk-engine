import { AlertTriangle, CheckCircle2, Gauge, ShieldAlert } from "lucide-react";

import type { RiskAssessmentResponse, RiskBand } from "../types/risk";

interface RiskSummaryProps {
  result?: RiskAssessmentResponse;
  loading: boolean;
}

const bandStyle: Record<RiskBand, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  low: { label: "Low", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  moderate: { label: "Moderate", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle },
  high: { label: "High", color: "text-red-700 bg-red-50 border-red-200", icon: ShieldAlert },
};

export function RiskSummary({ result, loading }: RiskSummaryProps) {
  const score = result ? Math.round(result.readmission_risk * 100) : 0;
  const band = result ? bandStyle[result.risk_band] : undefined;
  const Icon = band?.icon ?? Gauge;

  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">30-day readmission risk</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-semibold tabular-nums text-slate-950">{loading ? "--" : score}</span>
            <span className="pb-2 text-lg font-medium text-slate-500">%</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${band?.color ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
          <Icon size={18} />
          <span>{band?.label ?? "Pending"}</span>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all ${result?.risk_band === "high" ? "bg-red-500" : result?.risk_band === "moderate" ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${loading || !result ? 0 : score}%` }}
        />
      </div>
    </section>
  );
}
