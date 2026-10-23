'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AssigneeProvider } from '@/context/AssigneeContext';
import { NotificationBell, NotificationWatcher } from '@/components/AppNotifications';

function Header() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const isReport =
    pathname === '/' ||
    pathname === '/project-management/' ||
    pathname === '/project-management' ||
    pathname === '/report' ||
    pathname === '/report/' ||
    pathname?.endsWith('/report') ||
    pathname?.includes('/report/');
  const isProjects =
    pathname === '/projects' ||
    pathname === '/projects/' ||
    pathname?.startsWith('/projects/');
  const isProjectDetail =
    pathname === '/project' ||
    pathname === '/project/' ||
    pathname?.startsWith('/project/');
  const isAssignees =
    pathname === '/assignees' ||
    pathname === '/assignees/' ||
    pathname?.includes('/assignees/');
  const isEmployee =
    pathname === '/employee' ||
    pathname === '/employee/' ||
    pathname?.includes('/employee/');

  return (
    <header className="nav-dark sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:justify-between sm:px-6 sm:py-3">
        <Link href="/report/" className="group mr-auto flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/40 ring-1 ring-white/30 transition group-hover:scale-105">
            PM
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-tight">Project Timeline Tracker</span>
            <span className="block text-[11px] text-white/50">AE Research</span>
          </div>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-0.5 text-sm [-ms-overflow-style:none] [scrollbar-width:none] sm:order-none sm:w-auto sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <Link
            href="/report/"
            className={`nav-link ${isReport ? 'nav-link-active' : ''}`}
          >
            Report
          </Link>
          <Link
            href="/projects/"
            className={`nav-link ${isProjects || isProjectDetail ? 'nav-link-active' : ''}`}
          >
            Projects
          </Link>
          <Link
            href="/employee/"
            className={`nav-link ${isEmployee ? 'nav-link-active' : ''}`}
          >
            Employee
          </Link>
          <Link
            href="/assignees/"
            className={`nav-link ${isAssignees ? 'nav-link-active' : ''}`}
          >
            Assignees
          </Link>
          {!loading && user && user.role !== 'employee' && <NotificationBell />}
          {!loading && user && (
            <div className="ml-1 flex shrink-0 items-center gap-1 border-l border-white/15 pl-2 sm:ml-2 sm:gap-2 sm:pl-3">
              <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 sm:inline">
                {user.username}
              </span>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin =
    pathname === '/login' ||
    pathname === '/login/' ||
    pathname?.endsWith('/login') ||
    pathname?.includes('/login/');
  const isEmployeeView =
    pathname === '/employee/view' ||
    pathname === '/employee/view/' ||
    pathname?.includes('/employee/view/');

  if (isLogin || isEmployeeView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AssigneeProvider>
        <NotificationWatcher />
        <AppShell>{children}</AppShell>
      </AssigneeProvider>
    </AuthProvider>
  );
}
