'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAssignees } from '@/context/AssigneeContext';
import { SELF_ASSIGNEE } from '@/lib/assignees';

interface Props {
  value: string[];
  onChange: (emails: string[]) => void;
}

function displayLabel(email: string): string {
  if (!email.includes('@')) return email;
  return email.split('@')[0];
}

export default function AssignToSelect({ value, onChange }: Props) {
  const { assignees, assigneeValues, loading, addAssignee, removeAssignee } = useAssignees();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const options = useMemo(() => [SELF_ASSIGNEE, ...assigneeValues], [assigneeValues]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setDraft(value);
        setAddError('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const openDropdown = () => {
    setDraft(value);
    setAddError('');
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

  const handleAddAssignee = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;

    setAdding(true);
    setAddError('');
    try {
      await addAssignee(trimmed);
      setNewEmail('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add assignee');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAssignee = async (id: number, email: string) => {
    if (id <= 0) return;
    if (!confirm(`Remove "${email}" from the assignee list?`)) return;

    setDeletingId(id);
    try {
      await removeAssignee(id);
      const nextDraft = draft.filter((item) => item.toLowerCase() !== email.toLowerCase());
      const nextValue = value.filter((item) => item.toLowerCase() !== email.toLowerCase());
      setDraft(nextDraft);
      if (nextValue.length !== value.length) {
        onChange(nextValue);
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to delete assignee');
    } finally {
      setDeletingId(null);
    }
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
          <div className="max-h-52 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-2 text-sm text-slate-500">Loading assignees...</p>
            ) : (
              options.map((email) => {
                const assignee = assignees.find(
                  (item) => item.value.toLowerCase() === email.toLowerCase()
                );
                const canDelete = assignee && assignee.id > 0;

                return (
                  <div
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-50"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-1 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.includes(email)}
                        onChange={() => toggle(email)}
                        className="rounded border-slate-300"
                      />
                      <span className="truncate text-slate-700">{email}</span>
                    </label>
                    {canDelete && (
                      <button
                        type="button"
                        title="Remove assignee"
                        disabled={deletingId === assignee.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteAssignee(assignee.id, email);
                        }}
                        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === assignee.id ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 p-2">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Add assignee</p>
            <div className="flex gap-2">
              <input
                type="email"
                className="input-field h-8 min-w-0 flex-1 text-sm"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setAddError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAssignee();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddAssignee}
                disabled={adding || !newEmail.trim()}
                className="btn-primary h-8 shrink-0 px-3 text-sm disabled:opacity-50"
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
            {addError && <p className="mt-1.5 text-xs text-red-600">{addError}</p>}
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
                {displayLabel(email)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
