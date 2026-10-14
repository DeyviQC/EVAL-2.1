# Four role dashboards and authorization — verification
## Implemented
- Independent student, teacher, director and vice-principal home components and explicit per-role menus.
- Server-resolved single dashboard role, fail-closed profile loading, workspace allowlists and no client role selector.
- Student course/activity/calendar/resource shortcuts; teacher classroom/delivery/material organization; executive read-only director consultation; vice-principal institutional management.
- Shared institutional palette: #142D56, #28599B, #FFFFFF, #D4AF37, #F3F6FB. Responsive grid, sidebar, keyboard-accessible navigation, reduced-motion support and independent user-list/create tabs.
- Director business mutations are rejected before dispatch, including personal password and notice updates. Authentication remains permitted.
- The human explicitly authorized transferring period/catalog/enrollment/user/calendar administration to the vice principal. Domain write guards and read authorization were updated accordingly; existing teacher/student assignment and grading boundaries are unchanged.
## Validation
187 frontend contract/render tests passed; TypeScript and production build passed.
45 authenticated API assertions verified role projections, rejected injected role selectors, director mutation denial, vice-principal management access, teacher/student boundaries and no new academic data.
7 direct service checks verified director denial and actual vice-principal period insertion reaching a forced ledger rollback. Temporary triggers were removed; no records retained.
25 browser assertions covered four separate dashboards, actual module navigation at 1360px and 390px, director controls absent, query-string role spoofing ignored and no horizontal page overflow. Desktop/mobile screenshots were reviewed.
PHP syntax and whitespace checks passed. The final snapshot must retain four users and zero academic records.
## Files
Frontend: role-dashboards.tsx, role-dashboards.test.tsx, SessionShell.tsx, InstitutionalShell.tsx, InstitutionalUI.tsx, InstitutionReadView.tsx, AccountWorkspace.tsx, accounts.ts, styles.css and contracts.runner.mjs.
Backend: academic route dispatch; account controller/service; academic authorization, navigation/directory/history/report read queries; vice-principal guards in period/catalog/enrollment/transfer/assignment/replacement/calendar commands; accounts-only-compatible provisioning.
Verification harnesses: verify-role-policy-server.php and verify-role-dashboards.mjs.
## Limits
No new schema, records, fake counters or new teaching/assessment functionality. School tablet/LAN deployment acceptance remains separate.
Historical backend fixture suites encode the former director-management policy; the new scoped role-policy and live browser/API checks above are the verification run for this change. Historical gate evidence is not recertified.
Final snapshot: 38 tables / 19 migrations, four accounts, zero periods, assignments, enrollments and materials, ordinal 0. Director dashboard was reopened and authenticated.
