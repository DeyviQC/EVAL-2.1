import { exact, text, decimalId, date } from './contracts.js';

export type StudentDashboardOverview = {
  courses: number;
  pending: number;
  deliveries: number;
  graded: number;
  unread: number;
};

export type StudentDashboardAverage = {
  grade: 'AD' | 'A' | 'B' | 'C' | null;
  label: string;
};

export type ResumeClassroom = {
  grade_id: string;
  grade: string;
  section_id: string;
  section: string;
};

export type ResumeActivity = {
  kind: 'activity';
  id: string;
  assignment_id: string;
  course: string;
  classroom: ResumeClassroom;
  title: string;
  due_on: string | null;
  progress: number;
  cta: string;
};

export type UpcomingActivity = {
  id: string;
  assignment_id: string;
  title: string;
  course: string;
  due_on: string | null;
  category: 'today' | 'tomorrow' | 'later' | 'overdue';
};

export type StudentDashboardCourse = {
  id: string;
  subject: string;
  grade: string;
  section: string;
  teacher: string;
  progress: number;
  subject_color: string;
};

export type StudentDashboardNotice = {
  id: string;
  event: string;
  message: string;
  created_at: string;
  course: string | null;
};

export type AgendaSlot = {
  day: string;
  date: string;
  label: string;
  active: boolean;
  badge?: string;
};

export type StudentDashboardAgenda = {
  current_week: { number: number; start_on: string; end_on: string } | null;
  slots: AgendaSlot[];
};

export type StudentDashboard = {
  overview: StudentDashboardOverview;
  average: StudentDashboardAverage;
  resume: ResumeActivity | null;
  upcoming: UpcomingActivity[];
  courses: StudentDashboardCourse[];
  notices: StudentDashboardNotice[];
  agenda: StudentDashboardAgenda;
};

function nonnegativeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid dashboard count');
  }
  return value as number;
}

function percentage(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Invalid percentage');
  }
  return value;
}

function nullableDate(value: unknown): string | null {
  return value === null ? null : date(value);
}

function grade(value: unknown): 'AD' | 'A' | 'B' | 'C' | null {
  if (value === null) return null;
  if (value !== 'AD' && value !== 'A' && value !== 'B' && value !== 'C') {
    throw new Error('Invalid grade');
  }
  return value;
}

function dueCategory(value: unknown): 'today' | 'tomorrow' | 'later' | 'overdue' {
  if (value !== 'today' && value !== 'tomorrow' && value !== 'later' && value !== 'overdue') {
    throw new Error('Invalid due category');
  }
  return value;
}

function overview(value: unknown): StudentDashboardOverview {
  const row = exact(value, ['courses', 'pending', 'deliveries', 'graded', 'unread']);
  return {
    courses: nonnegativeInteger(row.courses),
    pending: nonnegativeInteger(row.pending),
    deliveries: nonnegativeInteger(row.deliveries),
    graded: nonnegativeInteger(row.graded),
    unread: nonnegativeInteger(row.unread),
  };
}

function average(value: unknown): StudentDashboardAverage {
  const row = exact(value, ['grade', 'label']);
  return { grade: grade(row.grade), label: text(row.label) };
}

function resumeClassroom(value: unknown): ResumeClassroom {
  const row = exact(value, ['grade_id', 'grade', 'section_id', 'section']);
  return {
    grade_id: decimalId(row.grade_id),
    grade: text(row.grade),
    section_id: decimalId(row.section_id),
    section: text(row.section),
  };
}

function resume(value: unknown): ResumeActivity | null {
  if (value === null) return null;
  const row = exact(value, ['kind', 'id', 'assignment_id', 'course', 'classroom', 'title', 'due_on', 'progress', 'cta']);
  if (row.kind !== 'activity') throw new Error('Invalid resume kind');
  return {
    kind: 'activity',
    id: decimalId(row.id),
    assignment_id: decimalId(row.assignment_id),
    course: text(row.course),
    classroom: resumeClassroom(row.classroom),
    title: text(row.title),
    due_on: nullableDate(row.due_on),
    progress: percentage(row.progress),
    cta: text(row.cta),
  };
}

function upcomingItem(value: unknown): UpcomingActivity {
  const row = exact(value, ['id', 'assignment_id', 'title', 'course', 'due_on', 'category']);
  return {
    id: decimalId(row.id),
    assignment_id: decimalId(row.assignment_id),
    title: text(row.title),
    course: text(row.course),
    due_on: nullableDate(row.due_on),
    category: dueCategory(row.category),
  };
}

function course(value: unknown): StudentDashboardCourse {
  const row = exact(value, ['id', 'subject', 'grade', 'section', 'teacher', 'progress', 'subject_color']);
  return {
    id: decimalId(row.id),
    subject: text(row.subject),
    grade: text(row.grade),
    section: text(row.section),
    teacher: text(row.teacher),
    progress: percentage(row.progress),
    subject_color: text(row.subject_color),
  };
}

function notice(value: unknown): StudentDashboardNotice {
  const row = exact(value, ['id', 'event', 'message', 'created_at', 'course']);
  return {
    id: decimalId(row.id),
    event: text(row.event),
    message: text(row.message),
    created_at: text(row.created_at),
    course: row.course === null ? null : text(row.course),
  };
}

function agenda(value: unknown): StudentDashboardAgenda {
  const row = exact(value, ['current_week', 'slots']);
  let current_week: StudentDashboardAgenda['current_week'] = null;
  if (row.current_week !== null) {
    const week = exact(row.current_week, ['number', 'start_on', 'end_on']);
    current_week = {
      number: nonnegativeInteger(week.number),
      start_on: date(week.start_on),
      end_on: date(week.end_on),
    };
  }
  if (!Array.isArray(row.slots)) throw new Error('Invalid agenda slots');
  const slots = row.slots.map(slot => {
    const s = exact(slot, ['day', 'date', 'label', 'active'], ['badge']);
    const result: AgendaSlot = {
      day: text(s.day),
      date: text(s.date),
      label: text(s.label),
      active: typeof s.active === 'boolean' ? s.active : false,
    };
    if (s.badge !== undefined) result.badge = text(s.badge);
    return result;
  });
  return { current_week, slots };
}

export function studentDashboard(value: unknown): StudentDashboard {
  const row = exact(value, [
    'overview',
    'average',
    'resume',
    'upcoming',
    'courses',
    'notices',
    'agenda',
  ]);
  return {
    overview: overview(row.overview),
    average: average(row.average),
    resume: resume(row.resume),
    upcoming: Array.isArray(row.upcoming) ? row.upcoming.map(upcomingItem) : [],
    courses: Array.isArray(row.courses) ? row.courses.map(course) : [],
    notices: Array.isArray(row.notices) ? row.notices.map(notice) : [],
    agenda: agenda(row.agenda),
  };
}
