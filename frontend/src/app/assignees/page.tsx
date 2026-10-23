'use client';

import MainAuthGuard from '@/components/MainAuthGuard';
import AssigneeManager from '@/components/AssigneeManager';

export default function AssigneesPage() {
  return (
    <MainAuthGuard>
      <div className="page-enter space-y-6">
        <div>
          <p className="page-kicker">People</p>
          <h1 className="page-title">Team assignees</h1>
        </div>

        <AssigneeManager variant="page" />
      </div>
    </MainAuthGuard>
  );
}
