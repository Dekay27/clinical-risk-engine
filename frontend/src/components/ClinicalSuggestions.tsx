import { ClipboardCheck } from "lucide-react";

import type { ClinicalSuggestion } from "../types/risk";

interface ClinicalSuggestionsProps {
  suggestions: ClinicalSuggestion[];
}

const priorityClass = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

export function ClinicalSuggestions({ suggestions }: ClinicalSuggestionsProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={19} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">Clinical suggestions</h2>
      </div>

      <div className="mt-4 space-y-3">
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <article key={`${suggestion.priority}-${suggestion.title}`} className="rounded border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${priorityClass[suggestion.priority]}`}>
                  {suggestion.priority}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{suggestion.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{suggestion.rationale}</p>
            </article>
          ))
        ) : (
          <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Suggestions will appear after inference.
          </p>
        )}
      </div>
    </section>
  );
}
