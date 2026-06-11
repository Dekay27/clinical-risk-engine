import { Database, Info } from "lucide-react";

import type { ModelMetadata } from "../types/risk";

interface ModelTransparencyProps {
  metadata?: ModelMetadata;
}

export function ModelTransparency({ metadata }: ModelTransparencyProps) {
  return (
    <footer className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-panel">
      <div className="flex items-center gap-2 text-slate-900">
        <Info size={18} className="text-blue-600" />
        <h2 className="font-semibold">Model transparency</h2>
      </div>
      {metadata ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-2">
            <Database size={17} className="mt-0.5 text-slate-400" />
            <div>
              <p className="font-medium text-slate-800">{metadata.model_name}</p>
              <p>{metadata.model_family}</p>
            </div>
          </div>
          <div>
            <p className="font-medium text-slate-800">Target</p>
            <p>{metadata.target}</p>
          </div>
          <div>
            <p className="font-medium text-slate-800">Training data</p>
            <p>{metadata.training_dataset}</p>
          </div>
          <div>
            <p className="font-medium text-slate-800">AUC ROC</p>
            <p>{metadata.auc_roc.toFixed(3)}</p>
          </div>
          <p className="md:col-span-2">{metadata.disclaimer}</p>
        </div>
      ) : (
        <p className="mt-4 text-slate-500">Metadata loads from the backend when available.</p>
      )}
    </footer>
  );
}
