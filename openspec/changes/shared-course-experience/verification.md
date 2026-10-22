# Shared course experience — verification 2026-10-14

## Delivered

- `CourseClassroom.tsx` is the single dynamic course-detail layout for every curricular area and authorized assignment. `MyCourses` retains course/classroom queries and uses this layout instead of duplicating headers, tabs and detail branches.
- `AcademicWeekNavigation.tsx` renders configured bimesters, compact weeks, actual date ranges and bounded navigation. Tabs support keyboard arrows/Home/End. Current-week selection still uses school timezone and the previously verified gap behavior.
- `WeeksPanel.tsx` uses compact content filters, clear empty states, server-derived progress/feedback, cross-week pending consultation and a focused native dialog for delivery/assessment workflows. Older calendars, search, unassigned records and manual refresh remain secondary tools. Existing ActivityCard and MaterialsPanel functionality is reused.
- Teachers can publish a task from the selected course/week using existing services. Publication and week association are separate confirmed writes: partial/unknown outcomes retain the resource and block blind reposting, with explicit consultation/review. Material upload still uses the existing MaterialsPanel; weekly cards allow authorized reorganization.
- `CourseWeeksQuery` adds personal student progress or teacher aggregate delivery progress. Only the authenticated student's grade/feedback is exposed in student requests. Teachers see aggregate counts without a student's feedback in the list. The pending bucket returns only readable open tasks that are pending or awaiting review. No extra course routes or speculative content kinds were introduced.
- `DashboardOverview` / read-only `/account/overview` projects actual active academic counts within server-resolved role and enrollment/assignment scope. Four independently authorized dashboards show summary cards through `DashboardSummary`, with compact shared styles and retained module navigation.
- `DeliveryTiming` resolves late submission dates in America/Lima rather than prematurely classifying UTC-midnight deliveries.
- `GET /account/student-dashboard` projects a complete student home: overview counts, computed average grade, resume activity, upcoming deadlines, courses with progress, latest teacher notices, and weekly agenda slots. `StudentHome.tsx` consumes this endpoint and no longer relies on hardcoded sample data.
- Explicit development maintenance changed the four exact provisional default names to complete fictional names. No custom profile was overwritten. Credential hashes were checked unchanged in the transaction. The private before/after maintenance journal is `.local/eval-dev/profile-name-cleanup.json`; it is not a public app resource or a domain audit event. Role grants, IDs, enrollments and academic records remain unchanged.

## Executed verification

- Frontend supported suite: **234 passed, 0 failed**; includes reusable course rendering, actual calendar tabs, progress and overview contracts, student-dashboard decoder tests, semantic-button UI tests, existing auth/recovery/write safety tests.
- Backend `StudentDashboardQueryTest` authored for the new `/account/student-dashboard` projection; execution requires a PHP/MySQL environment.
- TypeScript/tooling checks and Vite production build: passed.
- PHP timing unit suite: **3 passed / 4 assertions**, including the exact Peru midnight boundary and no deadline.
- Real-browser/read-only integration: **130 checks passed** across four dashboards, three student subjects (Mathematics, Communication and Religious Education), two original-teacher classrooms (first and fifth grade), overview scoping, delivered/graded progress, personal feedback protection, cross-week pending queries, empty/new week transitions, arrow-key tabs, modal focus restoration, publication-form access, cross-classroom/course denial and mobile width 390.
- Persistent demonstration integrity: **764 checks passed** after the redesign; 300 enrollments, 20 classrooms, 200 courses/materials/tasks, 600 deliveries, 400 assessments and 4,000 notifications retained. Browser tests perform zero academic writes. No academic seed rerun or migration was required for the redesign.
- PHP syntax and Git whitespace checks passed.
- Inspected course screenshots for multiple subjects and each role dashboard. Screenshots remain private local artifacts under `.local/eval-dev/shared-*.png`.

## Limits

This redesign adapts implemented modules; it does not claim implementation of questionnaires, project/evaluation type schemas, attendance/schedules, support plans, promotion or PDF/XLSX exports. Those previously documented functional phases remain pending. Recent-grade/next-deadline lists and current-week home summaries are now implemented via `GET /account/student-dashboard` and rendered by `StudentHome.tsx`. The new weekly publication form was checked for permissions and availability but no new academic task was created by read-only UI acceptance. Existing write clients/domain services and their tests remain reused; a dedicated full write-journey acceptance for the combined publish-and-week operation remains future isolated-fixture work.
