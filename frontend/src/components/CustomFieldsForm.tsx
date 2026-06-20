'use client';

import { CustomFieldDefinition } from '@/lib/types';

interface Props {
  fields: CustomFieldDefinition[];
  values: Record<string, string | number>;
  onChange: (values: Record<string, string | number>) => void;
}

export default function CustomFieldsForm({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  const handleChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Custom Fields
      </p>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {field.field_label}
          </label>
          {field.field_type === 'select' && field.options_json ? (
            <select
              className="input-field"
              value={String(values[field.field_key] ?? '')}
              onChange={(e) => handleChange(field.field_key, e.target.value)}
            >
              <option value="">Select...</option>
              {field.options_json.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
              className="input-field"
              value={String(values[field.field_key] ?? '')}
              onChange={(e) => handleChange(field.field_key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
