# Classroom directory organization — Block 1

Date: 2026-10-09. Approved by the human with "ya" after the concrete Block 1 proposal.

## Scope

Organize existing enrollment and assignment directories by period, grade and section. Replace long record cards with compact tables. Add student-name search and current/historical enrollment tabs; add area, teacher and state assignment filters. Preserve existing mutations, role restrictions, retained records and audit history. Do not implement subsequent navigation, form, assessment or visual-redesign blocks without their separate approval.

## Design

- Keep classroom selectors independent from the existing create forms. A table is consulted only after its full period/grade/section scope is selected.
- Changing period clears grade and section; changing grade clears section. Section options belong to the selected grade. Changing filters invalidates older read responses and resets pagination and any selected maintenance action.
- Apply optional directory filters in MySQL before the existing ascending-ID cursor and 50-row limit. Search is a bound literal substring of retained display names, not an SQL wildcard expression.
- Enrollment views use existing retained states: current is active; history includes transferred and closed records. This does not infer expiration or change domain states.
- Assignment options retain their existing purpose-bound authority. No new general catalog access is granted to the vice principal.
- Authorization remains independent of filters. No actor, role, credential or mutation parameters are accepted as filters; invalid filters fail closed.
- Show the number of loaded rows as "shown", not as a total for the whole classroom. Further pages retain every selected filter.
- Horizontal table scrolling supports narrow screens; labels, captions and table header scopes remain accessible.

## Verification

- Frontend: 174 tests passed, including dependent classroom selectors, literal search encoding, authority rejection and filter-preserving pagination.
- Read-only HTTP/MySQL verification: 32 checks passed against the existing local demonstration. Includes records beyond the original first 50, classroom isolation, search, history separation, teacher/area filters, cursor paging, malformed-input rejection and director/vice-principal/teacher/student boundaries.
- Type checking and production build passed. No schema migration, account reset, academic write or database reseed was needed.
- Actual browser layout, physical tablet behavior and human acceptance remain to be checked. The integrated browser previously rejected the local certificate; no visual acceptance is claimed from the HTTP checks.

## Remaining blocks

Navigation/context retention; forms/confirmations; delivery/assessment workflow; visual hierarchy/home. Each requires the human's separate approval.
