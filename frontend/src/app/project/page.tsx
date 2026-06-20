'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  getProject,
  getTimelineItems,
  createTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
} from '@/lib/api';
import {
  Project,
  TimelineItem,
  TimelineType,
  TIMELINE_TYPES,
  TIMELINE_LABELS,
  TIMELINE_TAB_LABELS,
} from '@/lib/types';
import TimelineTab from '@/components/TimelineTab';
import AddTimelineItemForm from '@/components/AddTimelineItemForm';
import AuthGuard from '@/components/AuthGuard';
import { toApiPayload } from '@/lib/timeline-utils';

const GanttChart = dynamic(() => import('@/components/GanttChart'), {
  loading: () => <div className="skeleton h-48 w-full rounded-2xl" />,
  ssr: false,
});

const ExportButtons = dynamic(() => import('@/components/ExportButtons'), {
  loading: () => <div className="skeleton h-9 w-32 rounded-xl" />,
  ssr: false,
});

type ViewMode = TimelineType | 'gantt';

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const projectId = Number(searchParams.get('id'));

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ViewMode>('gantt');
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProject = async () => {
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    }
  };

  const loadAllItems = async () => {
    try {
      const data = await getTimelineItems(projectId);
      setAllItems(data);
    } catch {
      setAllItems([]);
    }
  };

  const loadItems = async (type: TimelineType) => {
    setItemsLoading(true);
    setError('');
    try {
      const data = await getTimelineItems(projectId, type);
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId || isNaN(projectId)) {
      setLoading(false);
      setError('Invalid project ID');
      return;
    }

    const init = async () => {
      setLoading(true);
      await loadProject();
      await loadAllItems();
      setLoading(false);
    };
    init();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || isNaN(projectId) || activeTab === 'gantt') return;
    loadItems(activeTab);
  }, [projectId, activeTab]);

  const handleAddItem = async (data: import('@/lib/timeline-utils').TimelineItemInput) => {
    if (activeTab === 'gantt') return;
    if (!projectId || isNaN(projectId)) {
      throw new Error('Project is required');
    }

    const payload = toApiPayload(data);
    const title = payload.title?.trim();
    if (!title) {
      throw new Error('Assign to is required');
    }

    const result = await createTimelineItem({
      project_id: projectId,
      timeline_type: activeTab,
      title,
      description: payload.description || undefined,
      status: payload.status,
      start_date: payload.start_date || undefined,
      due_date: payload.due_date || undefined,
      sort_order: 0,
      custom_fields: payload.custom_fields,
    });
    await loadItems(activeTab);
    await loadProject();
    await loadAllItems();
    return { emailSent: result.notifications?.sent ?? 0 };
  };

  const handleUpdateItem = async (
    id: number,
    updates: Partial<{
      title: string;
      description: string;
      status: string;
      start_date: string;
      due_date: string;
      custom_fields: Record<string, string | number>;
    }>
  ) => {
    const result = await updateTimelineItem(id, updates);
    if (activeTab !== 'gantt') await loadItems(activeTab);
    await loadProject();
    await loadAllItems();
    return { emailSent: result.notifications?.sent ?? 0 };
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Delete this timeline item?')) return;
    await deleteTimelineItem(id);
    if (activeTab !== 'gantt') await loadItems(activeTab);
    await loadProject();
    await loadAllItems();
  };

  if (loading) {
    return (
      <div className="card p-12">
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-enter space-y-4">
        <div className="alert-error">{error || 'Project not found'}</div>
        <Link href="/projects/" className="btn-secondary inline-flex">← Back to Projects</Link>
      </div>
    );
  }

  const totalItems = allItems.length;

  return (
    <div className="page-enter space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <Link href="/projects/" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-100 transition hover:text-white">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All projects
          </Link>
          <h1 className="mt-2 truncate text-xl font-bold tracking-tight sm:text-2xl">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-indigo-100">
            <span className="rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs">{project.project_id}</span>
            <span>{totalItems} timeline item{totalItems !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <ExportButtons project={project} allItems={allItems} />
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="card overflow-visible">
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/80 p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab('gantt')}
            className={activeTab === 'gantt' ? 'tab-pill-active' : 'tab-pill-inactive'}
          >
            {TIMELINE_TAB_LABELS.gantt}
          </button>
          {TIMELINE_TYPES.map((type) => {
            const count = project.timelines?.[type]?.count ?? 0;
            const isActive = activeTab === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={isActive ? 'tab-pill-active' : 'tab-pill-inactive'}
              >
                {TIMELINE_TAB_LABELS[type]}
                {count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive ? 'bg-white/25' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="overflow-visible p-5 sm:p-6">
          {activeTab === 'gantt' ? (
            <GanttChart items={allItems} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <AddTimelineItemForm
                  key={activeTab}
                  timelineType={activeTab}
                  timelineLabel={TIMELINE_LABELS[activeTab]}
                  onSubmit={handleAddItem}
                />
              </div>
              <div className="lg:col-span-2">
                <TimelineTab
                  timelineType={activeTab}
                  items={items}
                  loading={itemsLoading}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="card p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        }
      >
        <ProjectDetailContent />
      </Suspense>
    </AuthGuard>
  );
}
