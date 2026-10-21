import { useEffect, useState } from 'react';
import type { AccountClient } from './accounts.js';
import type { ActivityClient, Activity } from './activities.js';
import { StudentTaskList, StudentTaskDrawer } from './StudentTaskList.js';
import type { StudentTask, StudentTasks } from './student-tasks.js';
import { AcademicApiError } from './api.js';

export function StudentTasksWorkspace({ accounts, activities, onExpired }: { accounts: AccountClient; activities: ActivityClient; onExpired: () => void }) {
  const [data, setData] = useState<StudentTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<StudentTask | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [revision, setRevision] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await accounts.studentTasks();
      setData(result);
    } catch (err) {
      if (err instanceof AcademicApiError && (err.status === 401 || err.status === 419)) {
        onExpired();
        return;
      }
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    accounts
      .studentTasks()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof AcademicApiError && (err.status === 401 || err.status === 419)) {
          onExpired();
          return;
        }
        setError(true);
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accounts, revision]);

  useEffect(() => {
    if (!selected) {
      setActivity(null);
      return;
    }
    let active = true;
    activities
      .detail(selected.id)
      .then((result) => {
        if (active) setActivity(result);
      })
      .catch(() => {
        if (active) setActivity(null);
      });
    return () => {
      active = false;
    };
  }, [selected, activities]);

  return (
    <section aria-label="Tareas" className="space-y-6">
      <StudentTaskList data={data} loading={loading} error={error} onRetry={() => setRevision((v) => v + 1)} onOpen={setSelected} />
      <StudentTaskDrawer task={selected} activity={activity} onClose={() => setSelected(null)} />
    </section>
  );
}
