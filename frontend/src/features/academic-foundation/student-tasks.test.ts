import { studentTasks, type StudentTasks } from './student-tasks.js';

type Case = readonly [string, () => void];

function equal(a: unknown, b: unknown): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('Values differ');
  }
}

function rejects(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const task = (overrides: Partial<StudentTasks['items'][number]> = {}): StudentTasks['items'][number] => ({
  id: '1',
  assignment_id: '10',
  title: 'Guía de ecuaciones',
  due_on: '2026-10-26',
  category: 'later',
  course: { id: '10', subject: 'Matemática', teacher: 'Prof. López', color: '#3B82F6' },
  state: 'open',
  delivery: { has_delivery: false, is_graded: false, delivered_at: null, filename: null, grade: null, feedback: null, graded_at: null },
  can_submit: true,
  ...overrides,
});

const base: StudentTasks = {
  items: [task()],
  overview: { pending: 1, delivered: 0, graded: 0, overdue: 0 },
};

export const studentTasksCases: Case[] = [
  ['student tasks decoder accepts a valid pending payload', () => {
    equal(studentTasks(base), base);
  }],
  ['student tasks decoder accepts delivered and graded tasks', () => {
    const delivered = task({ id: '2', delivery: { has_delivery: true, is_graded: false, delivered_at: '2026-10-20', filename: 'tarea.pdf', grade: null, feedback: null, graded_at: null } });
    const graded = task({ id: '3', delivery: { has_delivery: true, is_graded: true, delivered_at: '2026-10-20', filename: 'tarea.pdf', grade: 'AD', feedback: 'Excelente trabajo', graded_at: '2026-10-21' }, can_submit: false });
    const input = { items: [delivered, graded], overview: { pending: 0, delivered: 1, graded: 1, overdue: 0 } };
    equal(studentTasks(input), input);
  }],
  ['student tasks decoder rejects invalid due categories', () => {
    rejects(() => studentTasks({ ...base, items: [task({ category: 'soon' as StudentTasks['items'][number]['category'] })] }));
  }],
  ['student tasks decoder rejects invalid grade values', () => {
    rejects(() => studentTasks({ ...base, items: [task({ delivery: { ...task().delivery, is_graded: true, grade: 'E' as 'AD' } })] }));
  }],
  ['student tasks decoder rejects invalid task states', () => {
    rejects(() => studentTasks({ ...base, items: [task({ state: 'draft' as 'open' })] }));
  }],
  ['student tasks decoder rejects malformed decimal ids', () => {
    rejects(() => studentTasks({ ...base, items: [task({ id: '01' })] }));
    rejects(() => studentTasks({ ...base, items: [task({ assignment_id: 10 as unknown as string })] }));
  }],
  ['student tasks decoder rejects invalid dates', () => {
    rejects(() => studentTasks({ ...base, items: [task({ due_on: '2026-10-32' })] }));
    rejects(() => studentTasks({ ...base, items: [task({ delivery: { ...task().delivery, delivered_at: 'hoy' as string } })] }));
  }],
  ['student tasks decoder rejects extra fields', () => {
    rejects(() => studentTasks({ ...base, items: [{ ...task(), extra: true }] }));
    rejects(() => studentTasks({ ...base, overview: { ...base.overview, extra: true } }));
  }],
  ['student tasks decoder accepts nullable due date and delivery fields', () => {
    const withoutDue = task({ due_on: null, category: 'later' as const });
    equal(studentTasks({ items: [withoutDue], overview: { pending: 1, delivered: 0, graded: 0, overdue: 0 } }).items[0]!.due_on, null);
  }],
  ['student tasks decoder accepts all valid due categories', () => {
    for (const category of ['overdue', 'today', 'tomorrow', 'this_week', 'later'] as const) {
      const due = category === 'overdue' ? '2026-10-01' : category === 'today' ? '2026-10-20' : category === 'tomorrow' ? '2026-10-21' : category === 'this_week' ? '2026-10-25' : '2026-11-01';
      equal(studentTasks({ items: [task({ due_on: due, category })], overview: { pending: 1, delivered: 0, graded: 0, overdue: category === 'overdue' ? 1 : 0 } }).items[0]!.category, category);
    }
  }],
];
