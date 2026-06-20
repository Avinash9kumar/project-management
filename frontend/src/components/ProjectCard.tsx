import Link from 'next/link';
import { Project } from '@/lib/types';

interface Props {
  project: Project;
}

export default function ProjectCard({ project }: Props) {
  return (
    <Link
      href={`/project/?id=${project.id}`}
      className="card block transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-600">
        {project.project_id}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
      {project.end_date && (
        <p className="mt-1 text-sm text-red-600">
          End: {new Date(project.end_date + 'T00:00:00').toLocaleDateString()}
        </p>
      )}
      {project.created_at && (
        <p className="mt-2 text-sm text-slate-500">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      )}
      <p className="mt-4 text-sm font-medium text-brand-600">
        Open timelines →
      </p>
    </Link>
  );
}
