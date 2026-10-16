# Audit Trail Explorer (Visor de Bitácora Institucional)

## Outcome and approved direction

Provide a secure, read-only institutional audit trail explorer for the Director and Vice Principal to inspect immutable operational events recorded in the `academic_lifecycle_events` ledger and write guard ordinals. This provides total transparency, traceability, and administrative compliance with Peruvian educational auditing standards (MINEDU).

## Scope

- Read-only endpoint `GET /academic/audit-ledger` protected by role guard (strictly `director_admin` and `vice_principal`).
- Cursor-based pagination (50 events per page) ordered by ledger sequence with `after` cursor.
- Filters by `entity_type` (`period`, `entry`, `grade`, `section`, `enrollment`, `assignment`, `all`).
- Projection includes:
  - Event ID and operation sequence key (`operation_key`).
  - Target entity type and entity identifier.
  - Event type (e.g., `created`, `updated`, `transferred`, `replaced`, `closed`).
  - Previous and new state transitions.
  - Responsible actor display name (`actor_name`) and role derived from `retained_identities`.
  - Correlation ID for technical tracing.
  - Effective date (`effective_on`) and recorded microsecond timestamp (`recorded_at`) formatted in Peru timezone (`America/Lima`).
- Accessible UI view in the Director/Subdirection workspace with responsive design, search, filter tags, and empty/loading states.

## Boundaries

- Strictly read-only: no endpoint may delete, truncate, replay, or mutate ledger events (guaranteed by database triggers `ledger_no_update` and `ledger_no_delete`).
- Unrelated roles (`teacher`, `student`, or unauthenticated requests) are denied with HTTP 403 Forbidden.
- Sensitive credentials, salt, password hashes, or session tokens are never projected in metadata or actor details.
- Independent of external cloud or Internet: operates entirely against the local MySQL instance on LAN/WLAN.

## Acceptance scenarios

1. **Authorization Guard:** A request from a `student` or `teacher` account to `/academic/audit-ledger` MUST return `403 Forbidden`. Only `director_admin` and `vice_principal` receive `200 OK`.
2. **Deterministic Cursor Pagination:** Fetching page 1 returns at most 50 items and a valid `next_after` cursor. Querying with `after=<id>` returns subsequent sequential events without duplicates or skipped rows.
3. **State Transition Accuracy:** Events with state changes accurately report `previous_state` and `new_state` matching the recorded lifecycle transaction.
4. **Actor Attribution:** The event correctly displays the actor name from `retained_identity_profiles` without leaking internal credentials.
5. **Entity Filter:** Filtering by `entity_type=enrollment` returns only enrollment lifecycle events; filtering by `entity_type=assignment` returns only teaching assignment transitions.
6. **Timezone Representation:** Timestamps are displayed in Peruvian Standard Time (`America/Lima`, UTC-5).

## Verification and baseline

- Baseline commit: `20d887c`.
- Automated contract tests in Vitest verifying client adapter, response parsing, cursor pagination, and role guards.
- Backend server verification script (`verify-audit-server.php`) verifying read authorization, 403 denial for student/teacher, deterministic cursor pagination, and database immutability.
- All 213 existing frontend contract tests, TypeScript check, and Vite build must remain 100% green.
