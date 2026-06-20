'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (projectId: string, title: string) => Promise<void>;
}

export default function NewProjectModal({ open, onClose, onSubmit }: Props) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectId.trim() || !title.trim()) {
      setError('Project ID and name are required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(projectId.trim(), title.trim());
      setProjectId('');
      setTitle('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">New project</h2>
            <p className="text-xs text-slate-500">Create a project to track timelines</p>
          </div>
        </div>

        {error && <div className="alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Project ID</label>
            <input
              className="input-field"
              placeholder="e.g. 8852710"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Name</label>
            <input
              className="input-field"
              placeholder="e.g. Broadcom FedRAMP - May 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
