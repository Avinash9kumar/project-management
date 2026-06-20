'use client';

import { useState, useRef, useEffect } from 'react';
import { ASSIGNEE_EMAILS } from '@/lib/assignees';

interface Props {
  value: string[];
  onChange: (emails: string[]) => void;
}

export default function AssignToSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDraft(value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const openDropdown = () => {
    setDraft(value);
    setOpen(true);
  };

  const toggle = (email: string) => {
    const next = draft.includes(email)
      ? draft.filter((e) => e !== email)
      : [...draft, email];
    setDraft(next);
    onChange(next);
  };

  const handleClearDraft = () => {
    setDraft([]);
    onChange([]);
  };

  const handleSave = () => {
    onChange(draft);
    setOpen(false);
  };

  const label =
    value.length === 0
      ? 'Select assignees...'
      : value.length === 1
        ? value[0]
        : `${value.length} assigned`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="input-field flex h-auto min-h-8 w-full items-center justify-between text-left text-sm"
      >
        <span className={`truncate ${value.length === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
          {label}
        </span>
        <span className="ml-2 shrink-0 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded border border-slate-200 bg-white shadow-lg">
          <div className="max-h-44 overflow-y-auto py-1">
            {ASSIGNEE_EMAILS.map((email) => (
              <label
                key={email}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={draft.includes(email)}
                  onChange={() => toggle(email)}
                  className="rounded border-slate-300"
                />
                <span className="truncate text-slate-700">{email}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={handleClearDraft}
              className="btn-secondary h-8 flex-1 text-sm"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={draft.length === 0}
              className="btn-primary h-8 flex-1 text-sm disabled:opacity-50"
            >
              Save assign
            </button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">Assigned</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-red-600 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {value.map((email) => (
              <span
                key={email}
                className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
              >
                {email.includes('@') ? email.split('@')[0] : email}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
