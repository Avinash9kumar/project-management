'use client';

import AuthGuard from '@/components/AuthGuard';
import AssigneeManager from '@/components/AssigneeManager';

export default function AssigneesPage() {
  return (
    <AuthGuard>
      <div className="page-enter space-y-6">
        <div>
          <h1 className="page-title">Team assignees</h1>
        </div>

        <AssigneeManager variant="page" />
      </div>
    </AuthGuard>
  );
}
