'use client';

import { useState } from 'react';
import { useAssignees } from '@/context/AssigneeContext';

interface Props {
  variant?: 'page' | 'panel';
}

export default function AssigneeManager({ variant = 'panel' }: Props) {
  const { assignees, loading, error, addAssignee, removeAssignee, refreshAssignees } = useAssignees();
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const isPage = variant === 'page';
  const showContent = isPage || expanded;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDelete = async (id: number, email: string) => {
    if (id <= 0) return;
    if (!confirm(`Remove "${email}" from the team assignee list?`)) return;

    setDeletingId(id);
    try {
      await removeAssignee(id);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to delete assignee');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (id: number, url?: string) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } catch {
      setAddError('Could not copy link. Copy it manually from the browser address bar after opening.');
    }
  };

  const content = (
    <div className={isPage ? 'card p-4 sm:p-5' : 'border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5'}>
      {error && (
        <div className="alert-error mb-3 text-xs">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => refreshAssignees()}>
            Retry
          </button>
        </div>
      )}

      <p className="mb-3 text-xs text-slate-500">
        Team emails for assignment. Copy each employee&apos;s personal link — they sign in with their
        assignee username and password (e.g. mansiha / mansiha@11#11) to view their own read-only report.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          className="input-field h-10 flex-1 text-sm"
          placeholder="Add email e.g. name@ae-research.com"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            setAddError('');
          }}
        />
        <button type="submit" className="btn-primary h-10 shrink-0 px-5" disabled={adding || !newEmail.trim()}>
          {adding ? 'Adding...' : 'Add assignee'}
        </button>
      </form>
      {addError && <p className="mb-3 text-xs text-red-600">{addError}</p>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Personal link</th>
                <th className="w-20 px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignees.map((assignee) => (
                <tr key={`${assignee.id}-${assignee.value}`} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    <span className="truncate text-slate-800">{assignee.value}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {assignee.report_url ? (
                      <button
                        type="button"
                        onClick={() => handleCopyLink(assignee.id, assignee.report_url)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        {copiedId === assignee.id ? 'Copied' : 'Copy link'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {assignee.id > 0 ? (
                      <button
                        type="button"
                        title="Remove assignee"
                        disabled={deletingId === assignee.id}
                        onClick={() => handleDelete(assignee.id, assignee.value)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === assignee.id ? '...' : 'Delete'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Default</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isPage) {
    return content;
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Team assignees</p>
            <p className="text-xs text-slate-500">Emails for timeline assignment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {assignees.length}
          </span>
          <span className="text-slate-400">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {showContent && content}
    </div>
  );
}
