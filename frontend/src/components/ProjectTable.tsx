'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const MENU_WIDTH = 168;

function ActionsMenu({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const padding = 8;
    let left = rect.right - MENU_WIDTH;
    left = Math.max(padding, Math.min(left, window.innerWidth - MENU_WIDTH - padding));

    let top = rect.bottom + 6;
    const menuHeight = menuRef.current?.offsetHeight ?? 140;
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - menuHeight - 6);
    }

    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onScrollOrResize = () => updatePosition();

    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[9999] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-black/5"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100"
            onClick={() => {
              setOpen(false);
              router.push(`/project/?id=${project.id}`);
            }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
            onClick={() => {
              setOpen(false);
              onEdit(project);
            }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 active:bg-rose-100"
            onClick={() => {
              setOpen(false);
              onDelete(project);
            }}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 sm:h-10 sm:w-10"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.75" />
          <circle cx="8" cy="8" r="1.75" />
          <circle cx="13" cy="8" r="1.75" />
        </svg>
      </button>
      {menu}
    </div>
  );
}

function ProjectAvatar({ title }: { title: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">
      {title.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProjectTable({ projects, onEdit, onDelete }: Props) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">No projects yet</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Create your first project to start tracking timelines and assignees.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card overflow-visible p-4"
            onClick={() => router.push(`/project/?id=${project.id}`)}
          >
            <div className="flex items-start gap-3">
              <ProjectAvatar title={project.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{project.title}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{project.project_id}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(project.created_at)}</p>
              </div>
              <ActionsMenu project={project} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="card hidden overflow-visible md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Project ID</th>
                <th className="table-header">Created</th>
                <th className="table-header w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="group cursor-pointer transition hover:bg-indigo-50/40"
                  onClick={() => router.push(`/project/?id=${project.id}`)}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <ProjectAvatar title={project.title} />
                      <span className="font-semibold text-slate-900 group-hover:text-indigo-700">
                        {project.title}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                      {project.project_id}
                    </span>
                  </td>
                  <td className="table-cell text-slate-500">{formatDate(project.created_at)}</td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end">
                      <ActionsMenu project={project} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
