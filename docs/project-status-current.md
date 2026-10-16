# EVAL Current Project Status

Date: 2026-10-15. Reviewed baseline commit: `8fe5a99` (on branch `chore/documentation-navigation`, pushed to `origin`).
This assessment compares `openspec/config.yaml`, current approved change specifications, the functional-completion roadmap, automated test suites, and empirical verification receipts. Percentages are planning estimates, not automated completeness, coverage, certification or elapsed-work metrics.

---

## 1. Two Different Scopes

- **Local Academic Core: ~85–90% implemented.**  
  The approved local functional core is substantially implemented and verified: authentication and 4 MINEDU-aligned roles (`director_admin`, `vice_principal`, `teacher`, `student`), academic catalog, periods, enrollments, student transfers, teacher assignments and succession, protected materials with metadata edit/withdraw/restore, physical attachment replacement with cryptographic hash verification, private vice-principal observations, activities, multi-version submissions, qualitative AD/A/B/C grading with correction history, locked assessed evidence, classroom summary reports, private notification feeds, week associations, course library search, Peru timezone display, and the Classroom Presentation screen ("Pantalla de Aula").
- **Complete Institutional Product: ~55–65% functional coverage.**  
  The complete institutional product described in `openspec/config.yaml` includes broader institutional operational requirements: verified automated backup/restore drills, production LAN/WLAN deployment on Windows Server with offline capability, batch user/curriculum imports, PDF/XLSX report exports, audit log queries, and physical tablet/classroom load validation.

---

## 2. Implementation Matrix by Planned Module

| Planned Module | Current Status | Implemented & Verified Capabilities | Remaining Institutional Work |
|---|---|---|---|
| **User Administration** | Substantially Implemented (~85%) | Real credentials for 4 roles, password resets, active/inactive states, identity retention, credential revocation, role policy guard. | Mandatory initial password change flag, administrative batch import (CSV/XLSX), role succession workflows. |
| **Academic Catalog & Periods** | Substantially Implemented (~90%) | Grades, sections, instructional entries, academic periods (active, draft, closed), MINEDU 2026 36-week teaching calendar, 4 bimesters. | Official school term rollover and catalog archive validation. |
| **Teacher Assignments** | Substantially Implemented (~90%) | Planning, activation, closure, replacement, preserved historical lineage, scope isolation. | Bulk assignment imports and multi-teacher joint teaching workflows if approved. |
| **Educational Materials** | Substantially Implemented (~90%) | Upload, scoped access, protected downloads, metadata edit/withdraw/restore, attachment replacement with SHA-256 verification. | Long-term physical purge policy and storage quota controls. |
| **Material Review & Observations** | Substantially Implemented (~85%) | Purpose-bound vice-principal supervision, private teacher reply, state transitions, historical read-only protection. | Multi-turn observation threads, notification hooks for new observations. |
| **Activities & Submissions** | Substantially Implemented (~90%) | Multi-version deliveries, file evidence attachment, routing to original assignment, locked assessed versions, student transfer rejection, closed period blocking. | Additional activity types, timers, rubrics, and competencies. |
| **Auxiliary Grade Register** | Substantially Implemented (~80%) | Per-delivery AD/A/B/C grading, qualitative feedback, correction history retention, classroom progress summaries, student view. | Formal institutional register export (PDF/XLSX), bimester grade consolidation, custom scoring scales. |
| **Institutional Library** | Substantially Implemented (~80%) | Course-scoped protected library, case/accent-sensitive search (`utf8mb4_0900_as_cs`), wildcard literals (`%`, `_`), authorship preservation. | Global institutional public repository collection, document full-text indexing. |
| **Classroom Presentation ("Pantalla de Aula")** | Substantially Implemented (~85%) | Dedicated classroom view for projectors/interactive boards, inline protected PDF and image viewer, distraction-free navigation. | Physical projector and school tablet validation in classrooms. |
| **Notifications & Historial** | Substantially Implemented (~85%) | Private notification feed by role, read receipt tracking, CSRF protection, lifecycle ledger event tracking. | System-wide broadcast alerts and push notifications. |
| **Auditing & Resilience** | Partial (~60%) | Immutable `academic_lifecycle_events` ledger, write guard ordinals, atomic rollback verification across all domains. | Automated backup generation, verified clean restore drill, audit log viewer UI. |
| **Local/Remote Synchronization** | Deferred (~15%) | Architectural guidelines documented; offline LAN capability confirmed. | Formal sync protocol, conflict resolution policy, cloud bridge (deferred per user instruction). |

---

## 3. Verified Engineering Evidence (Commit `8fe5a99`)

### Frontend
- **Tests:** 207 automated contract/integration tests passing (0 failures, duration ~400ms via `npm test`).
- **Build & Typing:** Full TypeScript check (`tsc --noEmit`) and Vite production bundle (`npm run build`) passing cleanly.
- **Design System:** Editorial design inspired by modern digital products, using Google Fonts (**Fraunces** for headings and **Inter** for body/UI), full dark mode support, accessible contrast (WCAG AA), responsive layouts (390px, 768px, 1440px), and official institutional colors: Navy-950 (`#10244A`) and Warm Gold (`#E0A526`).

### Backend & Database
- **Database Schema:** 38 tables across 19 migrations (`2026_10_07_000001` through `2026_10_13_000002`).
- **Server Verification Suites (10/10 Passed · 573 total checks):**
  - `verify-users-server.php` (26 checks: authorization, retention, privileges).
  - `verify-reports-server.php` (39 checks, 52 rows: pagination, counts, grades).
  - `verify-assessments-server.php` (56 checks: corrections, evidence locking, closed periods).
  - `verify-activities-server.php` (45 checks: atomic rollback, routing, transfer denial).
  - `verify-material-maintenance-server.php` (73 checks: historical metadata, withdraw/restore).
  - `verify-observations-server.php` (94 checks: private scope, revision snapshots).
  - `verify-file-replacement-server.php` (138 checks: retained files, SHA-256 verification).
  - `verify-notifications-server.php` (52 checks: routing, private feed, revocation).
  - `verify-library-server.php` (43 checks: pagination, literal search, collations).
  - `verify-role-policy-server.php` (7 checks: director read-only, forced rollback).
- **Integration Journeys:** Real browser journeys covering week associations, calendar configuration, session recovery, and end-to-end activity submission/grading.

---

## 4. Prioritized Road Map

### P0 — Prerequisites for Institutional School Operation
1. **Automated Backup & Verified Restore:**
   - Automated scheduled backup scripts for MySQL database and physical `.local/eval-dev` file attachments.
   - Clean restoration drill on a blank environment.
   - Verification of 19 migrations integrity and data consistency after restore.
   - Written disaster recovery procedure.
2. **School LAN / WLAN Deployment:**
   - Transition runtime from loopback (`127.0.0.1`) to school LAN IP / local DNS.
   - Windows Server deployment runbook (IIS/Apache + PHP 8.4 + MySQL service).
   - Local TLS certificate generation and trust distribution.
   - Offline robustness verification (zero Internet, active LAN).
3. **Continuous Integration (CI):**
   - GitHub Actions workflow (`.github/workflows/ci.yml`) automating:
     - Frontend typecheck, 207 tests, and build.
     - Backend linting, PHPUnit tests, migration validation, and suite execution.
4. **Physical & Load Testing:**
   - Physical tablet devices (MINEDU school tablets) and projector validation.
   - Concurrency and throughput benchmarks under multi-classroom traffic.

### P1 — Important Institutional Enhancements
5. **Report Exports (PDF / XLSX):**
   - Export auxiliary grade register and classroom progress reports with cryptographic signatures / timestamps.
6. **Mandatory Initial Password Change:**
   - `temporary_password` flag requiring password update on first login.
7. **Administrative Batch Import:**
   - CSV / Excel import templates for students, teachers, classrooms, and assignments.
8. **Institutional Search & Audit Log Viewer:**
   - Audit trail explorer for directors and administrators to review critical lifecycle events.

### P2 — Future Evolution (Post-MVP)
9. Local/remote cloud synchronization (deferred pending conflict resolution policy).
10. QR attendance and schedules (outside initial MVP).
11. Advanced assessments (rubrics, competency matrices, online questionnaires).
12. Frontend code splitting and performance optimization (reducing the ~550KB bundle).

---

## 5. Non-Goals (Explicitly Excluded)
- Replacing SIAGIE (EVAL acts as a complementary institutional learning platform).
- Replacing the existing QR attendance hardware/system.
- Payment gateways or e-commerce features.
- Native mobile applications (PWA/Responsive web covers all devices).
- Improvised remote cloud synchronization without conflict policy approval.
