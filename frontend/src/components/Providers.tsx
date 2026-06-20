'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function Header() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const isProjects =
    pathname === '/' ||
    pathname === '/project-management/' ||
    pathname === '/project-management' ||
    pathname?.startsWith('/project');
  const isReport =
    pathname === '/report' ||
    pathname === '/report/' ||
    pathname?.endsWith('/report') ||
    pathname?.includes('/report/');

  return (
    <header className="nav-dark sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition group-hover:scale-105">
            PM
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-semibold tracking-tight">Project Timeline Tracker</span>
            <span className="block text-[11px] text-white/50">AE Research</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              isProjects
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            Projects
          </Link>
          <Link
            href="/report/"
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              isReport
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            Report
          </Link>
          {!loading && user && (
            <div className="ml-2 flex items-center gap-2 border-l border-white/15 pl-3">
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

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
