import type { ReactNode } from "react";

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  value?: ReactNode;
}

export function FieldLabel({ htmlFor, label, value }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {value ? <span className="tabular-nums text-slate-500">{value}</span> : null}
    </label>
  );
}
