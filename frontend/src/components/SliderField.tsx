import { FieldLabel } from "./FieldLabel";

interface SliderFieldProps {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}

export function SliderField({ id, label, min, max, value, onChange, unit }: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} value={`${value}${unit ? ` ${unit}` : ""}`} />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
