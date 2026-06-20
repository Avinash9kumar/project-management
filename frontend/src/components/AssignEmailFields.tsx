'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAssignees } from '@/context/AssigneeContext';
import { SELF_ASSIGNEE, DEFAULT_ASSIGNEE_EMAILS } from '@/lib/assignees';

interface Props {
  mainAssign: string;
  ccAssign: string[];
  onMainChange: (value: string) => void;
  onCcChange: (values: string[]) => void;
}

function displayLabel(email: string): string {
  if (!email.includes('@')) return email;
  return email.split('@')[0];
}

export default function AssignEmailFields({
  mainAssign,
  ccAssign,
  onMainChange,
  onCcChange,
}: Props) {
  const { assigneeValues, loading } = useAssignees();
  const [ccOpen, setCcOpen] = useState(false);
  const [ccDraft, setCcDraft] = useState<string[]>(ccAssign);
  const ccRef = useRef<HTMLDivElement>(null);

  const emailPool = assigneeValues.length > 0 ? assigneeValues : [...DEFAULT_ASSIGNEE_EMAILS];
  const options = useMemo(() => [SELF_ASSIGNEE, ...emailPool], [emailPool]);
  const ccOptions = useMemo(
    () => options.filter((email) => email !== mainAssign),
    [options, mainAssign]
  );

  useEffect(() => {
    setCcDraft(ccAssign);
  }, [ccAssign]);

  useEffect(() => {
    if (mainAssign && ccAssign.includes(mainAssign)) {
      onCcChange(ccAssign.filter((email) => email !== mainAssign));
    }
  }, [mainAssign, ccAssign, onCcChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) {
        setCcOpen(false);
        setCcDraft(ccAssign);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ccAssign]);

  const handleMainChange = (value: string) => {
    onMainChange(value);
    if (value && ccAssign.includes(value)) {
      onCcChange(ccAssign.filter((email) => email !== value));
    }
  };

  const toggleCc = (email: string) => {
    const next = ccDraft.includes(email)
      ? ccDraft.filter((e) => e !== email)
      : [...ccDraft, email];
    setCcDraft(next);
    onCcChange(next);
  };

  const ccLabel =
    ccAssign.length === 0
      ? 'Select CC recipients (optional)...'
      : ccAssign.length === 1
        ? ccAssign[0]
        : `${ccAssign.length} CC recipients`;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Main assign * <span className="font-normal text-slate-400">(receives email)</span>
        </label>
        <select
          className="input-field h-10 w-full text-sm"
          value={mainAssign}
          onChange={(e) => handleMainChange(e.target.value)}
          required
        >
          <option value="">Select main assignee...</option>
          {loading ? (
            <option disabled>Loading...</option>
          ) : (
            options.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="relative" ref={ccRef}>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          CC assign <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <button
          type="button"
          onClick={() => setCcOpen((open) => !open)}
          className="input-field flex h-auto min-h-8 w-full items-center justify-between text-left text-sm"
        >
          <span className={`truncate ${ccAssign.length === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
            {ccLabel}
          </span>
          <span className="ml-2 shrink-0 text-slate-400">▾</span>
        </button>

        {ccOpen && (
          <div className="absolute left-0 right-0 z-50 mt-1 rounded border border-slate-200 bg-white shadow-lg">
            <div className="max-h-44 overflow-y-auto py-1">
              {ccOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No other assignees available</p>
              ) : (
                ccOptions.map((email) => (
                  <label
                    key={email}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={ccDraft.includes(email)}
                      onChange={() => toggleCc(email)}
                      className="rounded border-slate-300"
                    />
                    <span className="truncate text-slate-700">{email}</span>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={() => {
                  setCcDraft([]);
                  onCcChange([]);
                }}
                className="btn-secondary h-8 flex-1 text-sm"
              >
                Clear CC
              </button>
              <button
                type="button"
                onClick={() => setCcOpen(false)}
                className="btn-primary h-8 flex-1 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Manage team emails on the{' '}
        <Link href="/assignees/" className="font-medium text-indigo-600 hover:underline">
          Assignees page
        </Link>
        .
      </p>

      {(mainAssign || ccAssign.length > 0) && (
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Email recipients</p>
          <div className="flex flex-wrap gap-1.5">
            {mainAssign && (
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200">
                To: {displayLabel(mainAssign)}
              </span>
            )}
            {ccAssign.map((email) => (
              <span
                key={email}
                className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
              >
                CC: {displayLabel(email)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
