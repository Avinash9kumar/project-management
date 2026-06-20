'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Assignee } from '@/lib/types';
import { createAssignee, deleteAssignee, getAssignees, isLoggedIn } from '@/lib/api';
import { DEFAULT_ASSIGNEE_EMAILS } from '@/lib/assignees';
import { useAuth } from '@/context/AuthContext';

interface AssigneeContextType {
  assignees: Assignee[];
  assigneeValues: string[];
  loading: boolean;
  error: string;
  refreshAssignees: () => Promise<void>;
  addAssignee: (value: string) => Promise<void>;
  removeAssignee: (id: number) => Promise<void>;
}

function buildFallbackAssignees(): Assignee[] {
  return DEFAULT_ASSIGNEE_EMAILS.map((value, index) => ({
    id: -(index + 1),
    value,
    sort_order: index,
  }));
}

const AssigneeContext = createContext<AssigneeContextType>({
  assignees: buildFallbackAssignees(),
  assigneeValues: [...DEFAULT_ASSIGNEE_EMAILS],
  loading: true,
  error: '',
  refreshAssignees: async () => {},
  addAssignee: async () => {},
  removeAssignee: async () => {},
});

export function AssigneeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [assignees, setAssignees] = useState<Assignee[]>(buildFallbackAssignees());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshAssignees = useCallback(async () => {
    if (!isLoggedIn()) {
      setAssignees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError('');
      const list = await getAssignees();
      setAssignees(list.length > 0 ? list : buildFallbackAssignees());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignees');
      setAssignees(buildFallbackAssignees());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isLoggedIn()) {
      refreshAssignees();
    } else {
      setAssignees([]);
      setLoading(false);
    }
  }, [user, authLoading, refreshAssignees]);

  const addAssignee = async (value: string) => {
    await createAssignee(value);
    await refreshAssignees();
  };

  const removeAssignee = async (id: number) => {
    await deleteAssignee(id);
    await refreshAssignees();
  };

  const assigneeValues = useMemo(() => {
    const values = assignees.map((item) => item.value).filter(Boolean);
    return values.length > 0 ? values : [...DEFAULT_ASSIGNEE_EMAILS];
  }, [assignees]);

  return (
    <AssigneeContext.Provider
      value={{
        assignees,
        assigneeValues,
        loading,
        error,
        refreshAssignees,
        addAssignee,
        removeAssignee,
      }}
    >
      {children}
    </AssigneeContext.Provider>
  );
}

export function useAssignees() {
  return useContext(AssigneeContext);
}
