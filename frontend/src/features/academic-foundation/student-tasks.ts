import { exact, text, decimalId, date, nullable } from './contracts.js';

export type TaskDueCategory = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later';

export type StudentTaskCourse = {
  id: string;
  subject: string;
  teacher: string;
  color: string;
};

export type StudentTaskDelivery = {
  has_delivery: boolean;
  is_graded: boolean;
  delivered_at: string | null;
  filename: string | null;
  grade: 'AD' | 'A' | 'B' | 'C' | null;
  feedback: string | null;
  graded_at: string | null;
};

export type StudentTask = {
  id: string;
  assignment_id: string;
  title: string;
  due_on: string | null;
  category: TaskDueCategory;
  course: StudentTaskCourse;
  state: 'open' | 'closed';
  delivery: StudentTaskDelivery;
  can_submit: boolean;
};

export type StudentTasksOverview = {
  pending: number;
  delivered: number;
  graded: number;
  overdue: number;
};

export type StudentTasks = {
  items: StudentTask[];
  overview: StudentTasksOverview;
};

const dueCategory = (value: unknown): TaskDueCategory => {
  if (value !== 'overdue' && value !== 'today' && value !== 'tomorrow' && value !== 'this_week' && value !== 'later') {
    throw new Error('Invalid due category');
  }
  return value as TaskDueCategory;
};

const grade = (value: unknown): StudentTaskDelivery['grade'] => {
  if (value === null) return null;
  if (value !== 'AD' && value !== 'A' && value !== 'B' && value !== 'C') {
    throw new Error('Invalid grade');
  }
  return value as StudentTaskDelivery['grade'];
};

const taskCourse = (value: unknown): StudentTaskCourse => {
  const row = exact(value, ['id', 'subject', 'teacher', 'color']);
  return {
    id: decimalId(row.id),
    subject: text(row.subject),
    teacher: text(row.teacher),
    color: text(row.color),
  };
};

const taskDelivery = (value: unknown): StudentTaskDelivery => {
  const row = exact(value, ['has_delivery', 'is_graded', 'delivered_at', 'filename', 'grade', 'feedback', 'graded_at']);
  return {
    has_delivery: typeof row.has_delivery === 'boolean' ? row.has_delivery : false,
    is_graded: typeof row.is_graded === 'boolean' ? row.is_graded : false,
    delivered_at: nullable(row.delivered_at, date),
    filename: nullable(row.filename, text),
    grade: grade(row.grade),
    feedback: nullable(row.feedback, text),
    graded_at: nullable(row.graded_at, date),
  };
};

const task = (value: unknown): StudentTask => {
  const row = exact(value, ['id', 'assignment_id', 'title', 'due_on', 'category', 'course', 'state', 'delivery', 'can_submit']);
  if (row.state !== 'open' && row.state !== 'closed') {
    throw new Error('Invalid task state');
  }
  return {
    id: decimalId(row.id),
    assignment_id: decimalId(row.assignment_id),
    title: text(row.title),
    due_on: nullable(row.due_on, date),
    category: dueCategory(row.category),
    course: taskCourse(row.course),
    state: row.state as StudentTask['state'],
    delivery: taskDelivery(row.delivery),
    can_submit: typeof row.can_submit === 'boolean' ? row.can_submit : false,
  };
};

export function studentTasks(value: unknown): StudentTasks {
  const row = exact(value, ['items', 'overview']);
  const overview = exact(row.overview, ['pending', 'delivered', 'graded', 'overdue']);
  return {
    items: (row.items as unknown[]).map(task),
    overview: {
      pending: typeof overview.pending === 'number' ? overview.pending : 0,
      delivered: typeof overview.delivered === 'number' ? overview.delivered : 0,
      graded: typeof overview.graded === 'number' ? overview.graded : 0,
      overdue: typeof overview.overdue === 'number' ? overview.overdue : 0,
    },
  };
}
