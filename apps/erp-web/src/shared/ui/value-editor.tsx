import type { SettingDataType } from "@erp/api-client";
import { FormField } from "./form-field";
import { Select } from "./select";

export function serializeValue(value: unknown, dataType?: SettingDataType): string {
  if (dataType === "STRING" || typeof value === "string") {
    return typeof value === "string" ? value : String(value ?? "");
  }
  if (dataType === "JSON" || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value, null, 2);
  }
  return String(value ?? "");
}

export function inferValueType(value: unknown): SettingDataType {
  if (typeof value === "number") return "NUMBER";
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "object" && value !== null) return "JSON";
  return "STRING";
}

export function parseValue(
  rawValue: string,
  dataType: SettingDataType,
): { value?: unknown; error?: string } {
  if (dataType === "STRING") {
    return { value: rawValue };
  }
  if (dataType === "NUMBER") {
    const value = Number(rawValue);
    return rawValue.trim() && Number.isFinite(value)
      ? { value }
      : { error: "Ingresa un número válido." };
  }
  if (dataType === "BOOLEAN") {
    return { value: rawValue === "true" };
  }
  try {
    return { value: JSON.parse(rawValue) as unknown };
  } catch {
    return { error: "Ingresa JSON válido." };
  }
}

export function formatValue(value: unknown): string {
  if (typeof value === "string") return value || "Cadena vacía";
  return JSON.stringify(value);
}

export function typeLabel(dataType: SettingDataType): string {
  return {
    STRING: "Texto",
    NUMBER: "Número",
    BOOLEAN: "Sí / No",
    JSON: "JSON",
  }[dataType];
}

interface ValueEditorProps {
  id: string;
  dataType: SettingDataType;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function ValueEditor({ id, dataType, value, error, onChange, autoFocus }: ValueEditorProps) {
  if (dataType === "BOOLEAN") {
    return (
      <Select
        id={id}
        name={id}
        label="Valor"
        value={value}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </Select>
    );
  }

  if (dataType === "JSON") {
    return (
      <label className="grid gap-2 text-[13px] font-bold text-[var(--ink)]" htmlFor={id}>
        Valor
        <textarea
          id={id}
          name={id}
          rows={8}
          value={value}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-y rounded-[10px] border border-[var(--line-strong)] bg-[var(--field)] px-3.5 py-3 font-mono text-[12px] font-medium leading-5 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        />
        {error ? (
          <span id={`${id}-error`} role="alert" className="text-[12px] text-[var(--danger)]">
            {error}
          </span>
        ) : (
          <span id={`${id}-hint`} className="text-[12px] font-medium text-[var(--muted)]">
            Usa sintaxis JSON válida para objetos, listas o valores nulos.
          </span>
        )}
      </label>
    );
  }

  return (
    <FormField
      id={id}
      name={id}
      label="Valor"
      type={dataType === "NUMBER" ? "number" : "text"}
      step={dataType === "NUMBER" ? "any" : undefined}
      value={value}
      autoFocus={autoFocus}
      error={error}
      hint={dataType === "NUMBER" ? "Se guardará como número, no como texto." : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
