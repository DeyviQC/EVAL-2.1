# Integral implementation baseline — 2026-10-14

The human's master request authorizes incremental implementation in the existing checkout. It replaces the earlier trimester decision with four bimesters and replaces the empty-demo preference with an additive, development-only 300-student dataset. Preserve existing accounts, credentials, records and retained history. No destructive migration is authorized.

## Verified architecture

- PHP 8.4, Laravel framework/Illuminate 13 dependencies; explicit local HTTP composition adapter, not a fully bootstrapped Laravel HTTP kernel.
- MySQL 8 local persistent `eval_dev`; 19 migrations, 38 tables at baseline.
- React 19/TypeScript, Vite and Tailwind. Role resolution and authorization are server-derived.
- Local four-role sessions; director read-only, vice principal academic management; teachers and students restricted to assignment/enrollment scope.

## Functional inventory

| Master phase | Existing behavior | Remaining acceptance work |
| --- | --- | --- |
| 1 Analysis | Source/routes/schema/permissions examined | Keep this inventory current |
| 2 Roles | Four dashboards, server checks, session recovery | Full cross-module access matrix as new modules land |
| 3 Foundation | Periods, grades, sections, areas, enrollment, assignment with lifecycle ledger | 20 classrooms / 300 female fictional students; schedules |
| 4 Weeks | Versioned calendars and material/activity week associations | Four-bimester enforcement, current-week selection, compact previous/next navigation, cross-week pending tasks, mandatory week on publication |
| 5 Activities | Task publication, text/files, deliveries, AD/A/B/C feedback, retained grade corrections | Activity types, attachments, questionnaires/timers, competencies/rubrics, teacher-authorized assessed resubmissions |
| 6 Attendance | No attendance schema, routes or UI found | Authorized scheduled sessions, status configuration, uniqueness, history/statistics |
| 7 Notifications | Persisted recipient-scoped feed and read receipts | Limit event policy to activity and grade publication; authorized content deep links |
| 8 Follow-up | Delivery/grade totals; material observations | Confidential student observations, transparent configurable alerts and support plans |
| 9 Reports | Real classroom totals and paginated grade/delivery roster | Bimester/week/teacher filters, attendance/follow-up reports, PDF/XLSX exports with access audit |
| 10 Demonstration | Legacy sample script does not meet new count/gender/role policy | New reproducible nonproduction dataset; detailed academic records for one bimester only |
| 11 Security | Bcrypt, CSRF, secure sessions, upload validation, append-only lifecycle/account events | Mandatory temporary-password replacement; administrative access/export audit |
| 12 Closure | Explicit period closure and historical enrollments | Reviewed promotion batches, fifth-grade completion, reversal rules |
| 13 UX | Four role menus, paging, classroom filtering and institutional palette | Weekly context across modules; fewer full-page loading transitions |
| 14 Validation | 192 frontend checks; existing live role/session probes | New module integration/E2E tests; isolated fixtures rather than modifying demonstration evidence |

The current database was intentionally emptied before this master request: only four original accounts remain. Reference calendar dates in the frontend are templates, not institutional records. No attendance/quiz/follow-up data should be displayed as though implemented.

## Sequential delivery plan

1. Validate the existing four-role baseline and document gaps (this file).
2. Complete calendar foundation: four bimesters, actual date selection and bounded navigation; preserve archived calendars.
3. Add an opt-in idempotent 300-student development dataset through existing audited commands; preserve original credentials. Use curricular areas verified against MINEDU, configurable institutional offer, and explicitly fictional dates/resources.
4. Extend week-aware activity publication, earlier pending tasks, resubmission authorization, assessments and questionnaires/rubrics.
5. Implement schedules and attendance, then recipient notifications and confidential follow-up.
6. Complete permission-filtered PDF/XLSX reports, first-login password changes and additional audit.
7. Implement reviewed promotion/year closure and validate the full 18-point acceptance list.

No phase is complete merely because its interface exists. Record modified files, additive migrations, executed tests and unfinished requirements after each bounded delivery. Do not seed production or overwrite human-managed records.

Curriculum reference: https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-secundaria.pdf (MINEDU secondary curricular programme).
