# Director consultation usability refinement

Date: 2026-11-04. Requested by the human with four current-screen references.

## Scope and change record

- Home: replaced generic hero text with course/aula guidance and added direct actions to monitoring and history. Existing consultation destinations and server summary metrics are retained.
- Reports: added a three-step explanation, grouped official document, print/PDF, Excel and CSV actions under an expandable download control, and clarified pending assessment terminology. Roster/consolidated views and export implementations are retained.
- Institutional information: added an organization/course-discovery switch. The course browser shows assignment context, teacher and classroom with access to activity consultation. Period, grade, section and course catalog consultations now have name search, state filtering and reset controls. Selecting a grade clears grade-search text before showing sections.
- Teacher/course discovery: added an explicit course/area selector using the existing catalog, with incremental catalog pagination. Selected course IDs filter assignments on the server before pagination; teacher name and assignment-state filters remain available.
- History: added accent-insensitive multi-term search across course, original teacher, student, period, grade and section; period/state selectors and a clear action; displayed the filtered/loaded record counts and a no-match message. Records use a responsive card grid.
- Shared presentation: improved heading hierarchy, filter panels, touch controls, responsive spacing and export wrapping. Existing history and report components are shared with other roles; their existing read authorization and permitted operations are retained.

## Search semantics

Institutional catalog and history text/state filters apply to the loaded page only and are labeled accordingly. They do not claim whole-institution results. Teacher-course discovery applies the selected course on the server and keeps cursor pagination. Catalog options beyond the first 50 are available through Cargar más cursos. No new database/API contract, dependency, schema or role grant was introduced in this refinement.

## Verification and boundaries

Frontend suite: 305 tests passed, including accent-insensitive matching and invalid monitoring metric rejection. Production build includes both TypeScript checks. Authenticated browser results are recorded after execution below. No remote publication or full institutional acceptance is implied.

## Manual review

1. Director home: use the monitoring/history hero actions.
2. Reports: select an aula and expand Descargar o imprimir reporte.
3. Institutional information: select Encontrar cursos y docentes; choose a course and submit Consultar cursos y docentes; inspect its activities.
4. Organization: open any catalog category and search/filter/reset.
5. History: choose Asignaciones to find courses, search with or without accents, narrow period/state, and clear filters. Continue pagination when needed.

Authenticated browser verification passed: report/teacher navigation, institutional course discovery, selected-course query parameter sent to the server, history search/reset, 390px horizontal-overflow check, and student-role denial of Director activity monitoring. The mobile screenshot was inspected; a narrow filter-label layout was corrected to a vertical stack and rechecked. The full institutional/load suite was not executed. Existing local data was retained.
