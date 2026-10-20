# Feature: Complete student home panel

**Objective:** Replace hardcoded content in the student dashboard (`StudentHome`) with real backend data, add complete loading/empty/error states, and harden accessibility so the student panel is finished and ready for review.
**Branch:** `feat/student-panel-completion`
**Delivery strategy:** `ask-on-risk`
**Test runner:** `npm test` (frontend, Vitest) plus PHP unit suite where backend contracts change.

## Specs

- **S1** — "ya lo termine la parte de estudiantes": finish the student panel so every visible widget on `StudentHome` reflects real server state or a truthful empty state.
- **S2** — "sera una pr grande": the branch will contain all student-home completion work in one pull request, split into reviewable commits by work unit.
- **S3** — Login improvements are explicitly out of scope for this PR; they will be handled in a separate branch.
- **S4** — Replace hardcoded resume card, upcoming deliveries, my courses, teacher notices, weekly agenda, average grade, and trend labels with data from existing backend endpoints where possible; add a backend projection only if existing endpoints cannot provide a coherent home snapshot.
- **S5** — Add loading skeletons, empty states, error/retry states, and accessible interactions (keyboard focus, semantic buttons, progress semantics, live regions) to every widget.
- **S6** — Add or update tests for `StudentHome`, data decoders, and widgets; existing behavior touched by shared code must keep passing.

## Tasks

| ID | Spec | Description | Route | Status | Commit |
|----|------|-------------|-------|--------|--------|
| T1 | S4, S6 | Define student-home data contract and query orchestration: create backend endpoint `GET /account/student-dashboard` that returns overview counts, average, resume activity, upcoming deliveries, courses with progress, latest notices, and weekly agenda; add frontend decoder and client. | inline | completed | `feat(student-dashboard): add /account/student-dashboard projection and decoder` |
| T2 | S1, S4 | Wire real "My courses" and "Upcoming deliveries" widgets; remove hardcoded course cards and task items; navigate to real sections. | inline | completed | `feat(student-dashboard): wire StudentHome to real /account/student-dashboard data` |
| T3 | S1, S4 | Wire real "Resume activity", teacher notices, weekly agenda, and metric labels (average/trend); ensure truthful labels and fallbacks. | inline | completed | `feat(student-dashboard): wire StudentHome to real /account/student-dashboard data` |
| T4 | S5, S6 | Accessibility and acceptance hardening: semantic controls, keyboard navigation, focus rings, progress accessibility, live regions, responsive checks; add/update tests. | inline | completed | `feat(student-dashboard): make TaskItem and CourseCard semantic buttons and add UI tests` |
| T5 | S2 | Verification: run focused tests, full frontend suite, and any affected backend checks; update OpenSpec verification notes if home summaries change status. | inline | open | |

## Proposed contract

`GET /account/student-dashboard` returns `{data: StudentDashboard}`.

```ts
type StudentDashboard = {
  overview: {
    courses: number;      // authorized active courses
    pending: number;      // open activities not yet delivered
    deliveries: number;   // total accepted deliveries
    graded: number;       // deliveries with an assessment
    unread: number;       // unread notifications
  };
  average: {
    grade: 'AD' | 'A' | 'B' | 'C' | null;
    label: string;        // e.g. "Destacado" or "En progreso"
  };
  resume: {
    kind: 'activity';
    id: string;
    assignment_id: string;
    course: string;       // "Subject · Grade Section"
    title: string;
    due_on: string | null;
    progress: number;     // estimated completion % for the activity
    cta: string;
  } | null;
  upcoming: Array<{
    id: string;
    assignment_id: string;
    title: string;
    course: string;
    due_on: string | null;
    category: 'today' | 'tomorrow' | 'later' | 'overdue';
  }>;
  courses: Array<{
    id: string;
    subject: string;
    grade: string;
    section: string;
    teacher: string;
    progress: number;     // % of published activities delivered/graded
    subject_color: string;
  }>;
  notices: Array<{
    id: string;
    event: string;
    message: string;
    created_at: string;
    course: string | null;
  }>;
  agenda: {
    current_week: { number: number; start_on: string; end_on: string } | null;
    slots: Array<{ day: string; date: string; label: string; active: boolean; badge?: string }>;
  };
};
```

### Design decisions

- **Average grade** is computed from the student’s graded deliveries using AD=4, A=3, B=2, C=1 and rounded to the nearest letter. If fewer than 3 graded deliveries exist, `grade` is `null` and `label` is "En progreso".
- **Resume activity** is the closest open activity the student has not yet delivered, ordered by `due_on` ASC. If none exists, `resume` is `null`.
- **Upcoming activities** are the next open activities not yet delivered (up to 5), excluding the resume activity, ordered by `due_on` ASC.
- **Course progress** is `delivered_and_graded_count / published_activities_count * 100` for that course; if no activities have been published, progress is `0`.
- **Subject colors** are derived from a fixed mapping by subject name so the UI stays consistent without backend changes.
- **Agenda** uses the current active calendar revision for the student’s active period and lists the current week plus the next 4 weeks, marking the current day.

## Log

- **L1** — Original request: "ahor si vamos a trabajar y esta vez solo aremos un comit en una rama para que se nos acpete como pull reques y hacer mergue con el trbajo de los demas compañeros a nosotros nos toco seguir mejorando lo de estudiantes ya tambien ay que mejorar el login ... nono no me entendiste ami solo me toco la parte de estudiantes y panel de login ... no tiene que se un pr simple dijeron que ya lo termine la parte de estudiantes sera una pr grande , hagamos todo"
- **L2** — Scope clarified to student panel only; login deferred to a later PR.
- **L3** — Explorer handoff: only `/account/overview` counts are real; resume card, KPIs, upcoming deliveries, courses, notices, and agenda are hardcoded. Existing backend endpoints are sufficient for most widgets.
- **L4** — OpenSpec note: `shared-course-experience/verification.md` currently marks home summaries (recent grade, next deadline, current week) as a future enhancement. This PR will move those items from future to implemented; verification doc must be updated in T5.
- **L5** — User approved the plan; branch `feat/student-panel-completion` created from `main@5e10917`; starting T1.
- **L6** — T1 completed: backend `StudentDashboardQuery`, route `/account/student-dashboard`, frontend decoder/client, and tests. Frontend suite passes 232/232; backend test authored but needs PHP environment to run.

- **L7** � T2/T3 completed: rewrote StudentHome.tsx to consume client.studentDashboard(), replacing all hardcoded content with real backend data; added loading skeletons, error retry, and empty states; updated ole-dashboards.test.tsx with a mock client. Frontend typecheck and 
pm test pass 232/232.

- **L8** � T4 completed: TaskItem and CourseCard now render as semantic <button> elements when clickable, with visible focus rings; added UI tests for semantic rendering. Frontend typecheck and 
pm test pass 234/234.
