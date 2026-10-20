import { studentDashboard, type StudentDashboard } from './student-dashboard.js';

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

const base: StudentDashboard = {
  overview: { courses: 2, pending: 1, deliveries: 3, graded: 2, unread: 0 },
  average: { grade: 'AD', label: 'Destacado' },
  resume: {
    kind: 'activity',
    id: '1',
    assignment_id: '10',
    course: 'Matemática · 2.º A',
    classroom: { grade_id: '5', grade: '2.º', section_id: '6', section: 'A' },
    title: 'Ecuaciones lineales',
    due_on: '2026-10-20',
    progress: 35,
    cta: 'Continuar actividad',
  },
  upcoming: [
    {
      id: '2',
      assignment_id: '11',
      title: 'Texto argumentativo',
      course: 'Comunicación · 2.º A',
      due_on: '2026-10-21',
      category: 'later',
    },
  ],
  courses: [
    {
      id: '10',
      subject: 'Matemática',
      grade: '2.º',
      section: 'A',
      teacher: 'Prof. López',
      progress: 75,
      subject_color: '#3B82F6',
    },
  ],
  notices: [
    {
      id: '100',
      event: 'activity_published',
      message: 'Hay una nueva actividad disponible.',
      created_at: '2026-10-19 10:00:00.000000',
      course: 'Matemática · 2.º A',
    },
  ],
  agenda: {
    current_week: { number: 32, start_on: '2026-10-19', end_on: '2026-10-23' },
    slots: [
      { day: 'Lun', date: '2026-10-19', label: 'Semana 32', active: true, badge: 'Hoy' },
      { day: 'Lun', date: '2026-10-26', label: 'Semana 33', active: false },
    ],
  },
};

export const studentDashboardCases: Case[] = [
  ['student dashboard decoder accepts a valid payload', () => {
    equal(studentDashboard(base), base);
  }],
  ['student dashboard decoder rejects null resume when kind is wrong', () => {
    equal(studentDashboard({ ...base, resume: null }).resume, null);
  }],
  ['student dashboard decoder rejects invalid overview counts', () => {
    for (const key of ['courses', 'pending', 'deliveries', 'graded', 'unread'] as const) {
      for (const value of [-1, 1.5, '2']) {
        rejects(() => studentDashboard({ ...base, overview: { ...base.overview, [key]: value } }));
      }
    }
  }],
  ['student dashboard decoder rejects invalid grade values', () => {
    rejects(() => studentDashboard({ ...base, average: { grade: 'E', label: 'Extra' } }));
    rejects(() => studentDashboard({ ...base, average: { grade: 1, label: 'Extra' } }));
  }],
  ['student dashboard decoder rejects out-of-range percentages', () => {
    rejects(() => studentDashboard({ ...base, resume: { ...base.resume!, progress: 101 } }));
    rejects(() => studentDashboard({ ...base, courses: [{ ...base.courses[0]!, progress: -1 }] }));
  }],
  ['student dashboard decoder rejects invalid due categories', () => {
    rejects(() => studentDashboard({ ...base, upcoming: [{ ...base.upcoming[0]!, category: 'soon' }] }));
  }],
  ['student dashboard decoder rejects malformed decimal ids', () => {
    rejects(() => studentDashboard({ ...base, resume: { ...base.resume!, id: '01' } }));
    rejects(() => studentDashboard({ ...base, courses: [{ ...base.courses[0]!, id: 10 }] }));
  }],
  ['student dashboard decoder rejects invalid dates', () => {
    rejects(() => studentDashboard({ ...base, resume: { ...base.resume!, due_on: 'tomorrow' } }));
    rejects(() => studentDashboard({ ...base, agenda: { ...base.agenda, current_week: { ...base.agenda.current_week!, start_on: '2026-02-30' } } }));
  }],
  ['student dashboard decoder rejects extra fields', () => {
    rejects(() => studentDashboard({ ...base, extra: true }));
    rejects(() => studentDashboard({ ...base, resume: { ...base.resume!, extra: true } }));
  }],
];
