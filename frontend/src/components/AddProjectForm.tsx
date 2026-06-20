'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (projectId: string, title: string, endDate?: string) => Promise<void>;
}

export default function AddProjectForm({ onSubmit }: Props) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectId.trim() || !title.trim()) {
      setError('Project ID and title are required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(projectId.trim(), title.trim(), endDate || undefined);
      setProjectId('');
      setTitle('');
      setEndDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="mb-4 text-lg font-semibold">Add New Project</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="projectId" className="mb-1 block text-sm font-medium text-slate-700">
            Project ID
          </label>
          <input
            id="projectId"
            type="text"
            className="input-field"
            placeholder="e.g. PRJ-001"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            maxLength={50}
          />
        </div>
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Project Title
          </label>
          <input
            id="title"
            type="text"
            className="input-field"
            placeholder="e.g. Website Redesign"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-slate-700">
            Project End Date
          </label>
          <input
            id="endDate"
            type="date"
            className="input-field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary mt-4" disabled={loading}>
        {loading ? 'Adding...' : 'Add Project'}
      </button>
    </form>
  );
}
