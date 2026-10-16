# Tasks: Audit Trail Explorer

- [x] 1. Create client contract and types for `AuditLedgerEntry` and `AuditLedgerResponse` in `frontend/src/features/academic-foundation/audit.ts`.
- [x] 2. Create automated contract tests in `frontend/src/features/academic-foundation/audit.test.ts` (RED phase: verifying schema, exact keys, filter parameters, and pagination).
- [x] 3. Implement query `AuditLedgerQuery.php` in backend to fetch paginated lifecycle events with joined actor profiles and strict scope filtering.
- [x] 4. Register `/academic/audit-ledger` route in `FoundationController.php` under director/subdirector authorization guard.
- [x] 5. Implement `AuditWorkspace.tsx` component in frontend with Arko editorial design, entity filtering, and pagination.
- [x] 6. Integrate `AuditWorkspace` into `AppSidebar.tsx` and `role-dashboards.tsx` for `director_admin` and `vice_principal` roles only.
- [x] 7. Run full frontend verification: 216 Vitest contract tests, TypeScript typecheck, and Vite production bundle.
- [x] 8. Verify backend endpoint and role denial for teacher/student via `manage-dev.ps1 -Command verify-audit -ServerOnly` (165 checks passed).
- [x] 9. Prepare committed handoff and update project documentation.
- [x] 10. Implement server-side global search (`search` parameter) across actor name, operation key, correlation ID, and event type in `AuditLedgerQuery.php`, update client adapter, contract tests, and UI debounced query.

