'use client';

import { useEffect, useState, useMemo } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api';
import { Project } from '@/lib/types';
import ProjectTable from '@/components/ProjectTable';
import NewProjectModal from '@/components/NewProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import AuthGuard from '@/components/AuthGuard';

export default function ProjectsPage() {
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

  const isSearching = search.trim().length > 0;

  return (
    <AuthGuard>
      <div className="page-enter space-y-5">
        <div className="projects-toolbar">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
            <div className="flex shrink-0 items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Projects</h1>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  className="toolbar-search"
                  placeholder="Search by project name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="stat-pill shrink-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-indigo-600 shadow-sm">
                  {filtered.length}
                </span>
                <span className="text-slate-600">
                  {isSearching ? (
                    <>
                      of <strong className="font-semibold text-slate-800">{projects.length}</strong> shown
                    </>
                  ) : (
                    <>project{filtered.length !== 1 ? 's' : ''}</>
                  )}
                </span>
              </div>
            </div>

            <button
              className="btn-primary w-full shrink-0 shadow-indigo-500/25 sm:w-auto"
              onClick={() => setShowNew(true)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New project
            </button>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="card overflow-hidden">
            <div className="table-header grid grid-cols-[1fr_120px_100px_80px] gap-4">
              <span>Project</span>
              <span>ID</span>
              <span>Updated</span>
              <span />
            </div>
            <div className="space-y-0 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 border-b border-slate-50 px-4 py-4 last:border-0">
                  <div className="skeleton h-5 flex-1" />
                  <div className="skeleton h-5 w-24" />
                  <div className="skeleton h-5 w-20" />
                  <div className="skeleton h-8 w-8 rounded-lg" />
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
