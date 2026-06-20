'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      await refreshUser();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="page-enter relative w-full max-w-md">
        <div className="card-elevated overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-8 text-white">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur">
              PM
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-indigo-100">Sign in to manage your project timelines</p>
          </div>

          <div className="p-8">
            {error && <div className="alert-error mb-5">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
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

        <p className="mt-6 text-center text-xs text-slate-400">
          Project Timeline Tracker · AE Research
        </p>
      </div>
    </div>
  );
}
