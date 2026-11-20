# Director academic monitoring extension

Status: requested direction recorded on 2026-11-04; detailed requirements, architecture, and revised prototype pending acceptance.

## Existing evidence

`ClassroomReport.php` provides a scoped classroom roster with name, historical membership, received deliveries, deliveries pending assessment, graded deliveries, and cursor pagination. `reports.ts` validates that pending plus graded equals received. Pending assessment must never be labeled missing student work. `InstitutionReadView.tsx` covers catalog consultation, not a dedicated student or teacher directory.

## Proposed student journey

Select academic period, grade, and section; view a paginated student roster; search by name across the selected scope; distinguish current enrollment from historical records. Open a read-only student summary within the selected context, showing activities, accepted deliveries, and recorded assessments only where server authorization permits. Preserve filters when returning to the roster. Show loading, empty, unavailable, and retry states explicitly. Do not expose credentials or unnecessary identity fields.

## Proposed teacher journey

Select period and teacher; inspect subject/area, grade, section, assignment dates, and active/historical assignment status. For one assignment, consult its activities and the counts of accepted deliveries, graded deliveries, and deliveries pending assessment. Navigate to an activity to inspect its existing publication/closure information and scoped academic evidence. Preserve the original teacher and assignment context across replacements.

## Metric definitions and boundaries

- Pending assessment: accepted deliveries without a current assessment; not missing deliveries.
- No published activities: factual empty state; not evidence of teacher noncompliance.
- Missing delivery counts and rates require an explicitly agreed eligible roster and timing rule before implementation; do not derive them by subtracting institution-wide totals.
- No teacher ranking, performance score, attendance inference, or automated sanctions.
- Director remains read-only. Teacher, student, and vice-principal mutation permissions remain unchanged.

## Architecture and verification plan

Reuse existing read models where sufficient. Cross-page student search and teacher/assignment/activity drill-down need an endpoint and authorization inventory before choosing new read contracts. This extension supersedes the original proposal's no-new-contract assumption for planning purposes only; it does not approve new endpoints or schemas. Queries must be bounded, paginated, server-authorized, and usable over the LAN without Internet. No database schema change is assumed.

Verify unauthorized role denial, scope injection denial, historical assignment ownership, zero-data states, pagination/search consistency, distinction between unsubmitted and ungraded work, keyboard navigation, and mobile table/card layouts after acceptance. Do not report these checks as executed yet.

## Change record and next acceptance

2026-11-04: expanded the proposed work from home guidance to student roster usability and teacher academic monitoring, as requested by the human. Application code has not changed. Next deliverable: revised prototype covering roster, teacher assignments, and activity drill-down, followed by bounded requirements/architecture acceptance and sequential implementation.
