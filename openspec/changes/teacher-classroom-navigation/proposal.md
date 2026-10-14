# Teacher classroom navigation — Block 2

Date: 2026-10-09. The human explicitly approved this concrete block with "Sii" after reviewing its proposed grade/section buttons and shared classroom selection.

## Approved scope

- Add grade buttons followed by the selected grade's section buttons to teacher My Courses, Materials and Library.
- Do not show the full mixed course list before a classroom is selected.
- Preserve classroom selection between these screens in the current session. Clear it on session changes; retain no selection across accounts or browser reloads.
- Derive available classrooms exclusively from the existing actor-authorized course query. Students keep their existing course flow and restrictions.
- Apply selected grade/section IDs before server cursor pagination; a cursor keeps that exact selection. Distinguish identically named sections by their stable IDs and grade relationship.
- Revalidate authorized classroom choices when entering a screen or explicitly refreshing. Cancel stale read results when changing grade, section or workspace; changing grade clears section and course detail.
- Keep course-detail, materials, library and publication authorization on the server. Filters never create authority or accept a client actor/role.
- No academic writes, schema changes, account resets, task-module consolidation or trimester conversion in this block. Subsequent blocks require separate human approval.

## Implementation

An additive read-only `/academic/my-course-classrooms` endpoint returns distinct authorized grade/section pairs independently of course pagination. `/academic/my-courses` accepts optional grade/section filters without changing its existing projection. The three teacher screens share session-owned classroom state and a common button component.

## Verification

- 179 frontend contract/UI tests passed, including dependent button visibility, duplicate/authority metadata rejection, stable classroom identity and filter-preserving paging.
- 59 read-only HTTP/MySQL checks passed: 40 authorized teacher classrooms across five grades, matching filtered course sets, cursor retention, materials/library access, cross-grade mismatch returning no rows, invalid-input rejection, director/vice-principal denial and student authorization scope.
- Frontend type checking and production build passed. PHP syntax and diff checks are recorded at completion.
- Human visual acceptance and physical tablet checks remain pending; no browser-layout acceptance is inferred from HTTP or static-markup tests.
