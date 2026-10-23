# Workflow audit and verification

Date: 2026-10-23 (America/Bogota).

## Confirmed server prerequisites and UI sequence
| Area | Sequence and restrictions |
| --- | --- |
| Periods | Required nonblank name and valid ordered dates. Creation produces a planned period; only planned -> active -> closed transitions exist. Another active period prevents activation. State changes require confirmation. |
| Catalog | Nonblank names, grade-bound section identity and normalized duplicate checks. Lookup/renaming do not change section ownership. Activation/deactivation preserves history. Catalog state changes use the shared confirmation modal. |
| Enrollments | Active year, active matching grade/section and eligible student. Grade, section and dates open in order. Changing year/classroom clears dependent fields. Reversed dates are blocked; transfers cannot target the same classroom. Close date cannot precede enrollment start or exceed the Lima business date. Server overlap and scope checks remain authoritative. |
| Assignments | Eligible teacher, planned/active year, active area and matching active classroom. Dates must fit the period; activation requires an active period and valid current interval. Replacing a teacher preserves authorship/history. Close date restrictions and residual cleanup permissions remain server-defined. |
| Users/import | Required name/username/role and server duplicate checks. Account maintenance requires confirmation. Import previews are revalidated when catalogs load and collect every metadata page. Student import is blocked if catalog validation is unavailable. Import stops on uncertain account/enrollment outcomes; earlier confirmed credentials are retained. No active year is explicitly disclosed before account-only student import. |
| Calendar | A year must be consulted before editing. Exactly four teaching bimesters, valid nonoverlapping weeks and period-contained dates. Published drafts and closed periods are read-only. Publication requires saved unchanged content, approval reference, explicit acknowledgement and final confirmation. |
| Supervision | Year -> grade -> section -> assigned course -> material. Private observations/review use server revision/state permissions, required text and final confirmation. Publishing still requires no director approval. |
| Reports/closures | Consult a valid classroom first. Closing/reopening requires an active year and Subdirection role. Changing context clears stale confirmation; late bimester reads cannot restore another year's data. Reopening requires a 10–500 character justification. Uncertain outcomes block repeating changes pending explicit review of the same year. |
| History/audit | Read-only queries; no maintenance commands introduced. Technical audit references remain on demand. |
| Notifications/account | Marking notices and changing the own password require confirmation. Password constraints remain server-enforced; confirmed outcome notices remain visible through session expiration. |

## Defects corrected
- Missing frontend field dependencies and nonblank/date-order gates.
- Stale bimester dialogs and late responses after context changes.
- Bimester write decoder accepted only `{id}` although the server returns a structured lifecycle acknowledgement. It now validates the exact returned target and state.
- Bimester commands wrongly permitted director writes despite the approved read-only director role. Server command and UI now restrict these mutations to Subdirection. Read access is retained.
- Bulk import continued after uncertain results; it now stops and blocks repeating the operation. Catalog pagination and late-preview validation were corrected.
- Shared centered native confirmation with cancellation, Escape and browser Back support; one final confirmation per action. Data-entry forms precede that confirmation where necessary. Normal actions are blue, warnings gold, sensitive changes red and confirmed outcomes green.

## Checks executed
- 293 frontend tests passed, typecheck and production build passed. Added invalid date-order and exact bimester acknowledgement regressions; updated the old transport fixture to match the actual server response.
- PHP syntax checks passed for the modified bimester command and its verification script.
- Read-only workflow acceptance: 36 checks, one intercepted successful write solely to test acknowledgement/toast display, six safe invalid-bimester authorization requests (director/teacher/student, close/reopen), zero actual academic mutations and zero browser exceptions. Covered required fields, reversed dates, parent invalidation, confirmation before transport, Cancel/Escape/Back cancellation, centered dark/mobile modal, account/period/catalog state confirmation, and stopping a three-row import after the first aborted account request without sending the next row.
- Existing progressive module acceptance: 91 checks across eleven modules, zero academic writes/browser exceptions.
- Catalog contrast/responsiveness acceptance: 27 checks, minimum measured contrast 4.9188:1 dark and 7.1753:1 light; zero writes. Its deactivation test was updated to use the shared modal.
- Inspected private screenshots: `action-confirmation-light.png`, `action-confirmation-dark.png`, `action-success-light.png`, `action-deactivation-dark.png`.

## Scope and limits
Server policy/command inspection covers all listed prerequisites; it is not a new exhaustive transaction or concurrency certification. No real create/import/close/reopen/publication/reset commands were submitted against the user's demo records. The success-toast acceptance uses a mocked acknowledgement, not a persisted new row. Existing mutating backend verification was updated for the director read-only rule but deliberately not executed on this database. No schema, account seed, destructive cleanup, commit or push operations in this block. Consultation never requires a confirmation. Permission or conflict rejection does not show a success notice.
