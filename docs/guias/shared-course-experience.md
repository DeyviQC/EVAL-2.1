# Shared course experience

The human's global four-role redesign and all-course classroom request are implemented as one shared UI change. No Mathematics-specific page exists.

## Layout and data ownership

`MyCourses` owns authorized course selection and existing server-filtered teacher grade/section metadata. `CourseClassroom` owns the common course header and content views. `AcademicWeekNavigation` owns reusable configured-date navigation. `WeeksPanel` reads the selected course/week's material and activity records and exposes the existing delivery/assessment UI in an accessible dialog.

`CourseWeeksQuery` checks course/resource access before returning progress or counting pending tasks. Student progress includes only the student's delivery/assessment; teacher progress includes authorized classroom totals with no feedback in the summary. Late status uses the latest delivery version's stored timestamp converted to Peru date and never invents a deadline. Navigating weeks makes read requests and cannot create duplicate records.

`DashboardSummary` shares presentation; `/account/overview` resolves role from persisted grants and calculates scope on the server. The four role dashboards retain their different menus and authority. Director remains read-only. Missing attendance, promotion, questionnaires and exports are not represented by nonfunctional buttons.

## Original fictional profile names

The latest redesign request explicitly supersedes the earlier preference to retain provisional profile labels. `normalize-demo-names.php` updates only the exact four development-default labels; usernames, credential hashes, role grants and academic IDs remain preserved. Before/after evidence is retained in the private development maintenance journal. This is a development correction, not a new general account-profile editing API.

## Access

Open the existing role launchers. Student: Mis cursos → Entrar al curso. Teacher: Cursos y aulas → authorized grade → assigned section → Entrar al curso. The common aula shows the chosen area, grade/section, assigned teacher and year. Bimester IV / week 28 contains the current demonstration content; other weeks show real empty states.

Verification and remaining functional limits: `openspec/changes/shared-course-experience/verification.md`.
