'use client';

import { useEffect, useState, useMemo } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api';
import { Project } from '@/lib/types';
import ProjectTable from '@/components/ProjectTable';
import NewProjectModal from '@/components/NewProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import AuthGuard from '@/components/AuthGuard';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const loadProjects = async () => {
    try {
      setError('');
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.project_id.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const handleCreate = async (projectId: string, title: string) => {
    await createProject(projectId, title);
    await loadProjects();
  };

  const handleEdit = async (id: number, title: string) => {
    await updateProject(id, { title });
    await loadProjects();
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
    try {
      await deleteProject(project.id);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return (
    <AuthGuard>
      <div className="page-enter space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle mt-1">
              Manage timelines, assignees, and deadlines across all your projects
            </p>
          </div>
          <button className="btn-primary shrink-0" onClick={() => setShowNew(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New project
          </button>
        </div>

        <div className="card flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              className="search-input"
              placeholder="Search by name or project ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm">
            <span className="font-semibold text-indigo-700">{filtered.length}</span>
            <span className="text-indigo-600/80">
              project{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card p-8">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton h-10 flex-1" />
                  <div className="skeleton h-10 w-24" />
                  <div className="skeleton h-10 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ProjectTable
            projects={filtered}
            onEdit={setEditProject}
            onDelete={handleDelete}
          />
        )}
      </div>

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={handleCreate}
      />

      <EditProjectModal
        project={editProject}
        onClose={() => setEditProject(null)}
        onSubmit={handleEdit}
      />
    </AuthGuard>
  );
}
