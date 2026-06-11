import { FieldLabel } from "./FieldLabel";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ id, label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} />
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-panel outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
