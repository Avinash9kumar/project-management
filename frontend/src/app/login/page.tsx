'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { routerPath } from '@/lib/config';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const isEmployeeLogin = searchParams.get('mode') === 'employee';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, isEmployeeLogin ? 'employee' : 'main');
      await refreshUser();
      const redirect = searchParams.get('redirect');
      if (isEmployeeLogin) {
        router.push(redirect ? decodeURIComponent(redirect) : routerPath('/login/'));
        return;
      }
      router.push(redirect ? decodeURIComponent(redirect) : routerPath('/report/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold shadow-lg shadow-indigo-500/40">
            PM
          </div>
          <div>
            <p className="text-sm font-semibold">Project Timeline Tracker</p>
            <p className="text-xs text-white/50">AE Research</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Timelines, in one place</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
            See what is due, who owns it, and what needs attention.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Reports, reminders, and assignee links stay in step with the same schedule.
          </p>
        </div>
        <p className="relative text-xs text-white/40">Built for the project desk</p>
      </aside>

      <div className="relative flex items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 lg:bg-none" />
        <div className="page-enter relative w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
              PM
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Project Timeline Tracker</p>
              <p className="text-xs text-slate-500">AE Research</p>
            </div>
          </div>
          <div className="card-elevated p-6 sm:p-8">
            <p className="page-kicker">{isEmployeeLogin ? 'Assignee' : 'Sign in'}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {isEmployeeLogin ? 'Your tasks' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEmployeeLogin
                ? 'Use your assignee username and password to view your tasks'
                : 'Sign in to manage your project timelines'}
            </p>

            {error && <div className="alert-error mt-5">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
                <input
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
