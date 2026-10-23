'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isLoggedIn } from '@/lib/api';
import { routerPath, stripBasePath } from '@/lib/config';

export default function MainAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isLoggedIn()) {
      const returnTo = encodeURIComponent(
        stripBasePath(window.location.pathname) + window.location.search + window.location.hash
      );
      router.replace(`${routerPath('/login/')}?redirect=${returnTo}`);
      return;
    }

    if (!loading && user?.role === 'employee') {
      router.replace(routerPath('/login/'));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user || user.role === 'employee') return null;

  return <>{children}</>;
}
