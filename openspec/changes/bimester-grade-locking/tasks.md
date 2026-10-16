# Tasks: Bimester Grade Locking Protocol

- [x] 1. Create database migration `backend/database/migrations/2026_10_16_000020_create_bimester_grade_closures.php` for `bimester_grade_closures` table with check constraints and unique `(period_id, bimester_number)`.
- [x] 2. Create maintenance runner `backend/dev-runtime/bimester-maintenance.php` to run migration 20 and apply dev runtime DML privileges.
- [x] 3. Update `backend/dev-runtime/inspect.php` and `manage-dev.ps1` to recognize migration 20 and maintenance commands.
- [x] 4. Implement `BimesterGradeLockCommands.php` with `close()` and `reopen()` supporting strict role guard (`director_admin` / `vice_principal`), mandatory justification on reopening, and append-only `LifecycleEvent` emissions.
- [x] 5. Implement `BimesterClosuresQuery.php` returning status, actors, timestamps, and justifications for all 4 bimesters.
- [x] 6. Enforce bimester locking guard in `DeliveryAssessment.php` blocking teacher assessment mutations when the activity's bimester is `locked`.
- [x] 7. Expose routes in `FoundationController.php`:
  - `GET /academic/bimesters`: retrieve bimester statuses for a period.
  - `POST /academic/bimesters/close`: close bimester and lock grades.
  - `POST /academic/bimesters/reopen`: reopen bimester with justification.
- [x] 8. Update `ClassroomReport.php` to project bimester states in report responses.
- [x] 9. Create automated server verification script `backend/dev-runtime/verify-bimesters-server.php` verifying authorization, state transitions, grade write blocking, and append-only lifecycle ledger events.
- [x] 10. Update frontend API client and contracts in `frontend/src/features/academic-foundation/api.ts` and `reports.ts`.
- [x] 11. Add contract tests in `frontend/src/features/academic-foundation/reports.test.ts` for bimester closing and reopening actions.
- [x] 12. Update `ReportWorkspace.tsx` to render bimester status badges, closure controls, and definitive vs provisional print views.
- [x] 13. Run full verification suite (server verification, Vitest tests, TypeScript, build) and prepare commit handoff.
- [x] 14. Harden bimester lock policy in `DeliveryAssessment.php`: resolve bimester via week or teaching block dates; fail unmapped activities with explicit `unmapped_bimester` error when any bimesters are locked; allow assessment when all bimesters are open.
- [x] 15. Add concurrency tests and multi-cycle lifecycle verification (close -> reopen -> reclose) in `verify-bimesters-server.php` (40 checks passed).
