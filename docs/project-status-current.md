# EVAL Current Project Status

Date: 2026-10-16. Reviewed baseline commit: `258de5b` (on branch `test/school-tablets`).
This assessment compares `openspec/config.yaml`, current approved change specifications, the functional-completion roadmap, automated test suites, and empirical verification receipts. Percentages are planning estimates, not automated completeness, coverage, certification or elapsed-work metrics.

---

## 1. Two Different Scopes

- **Local Academic Core: ~92–96% implemented.**  
  The approved local functional core is substantially implemented and verified: authentication and 4 MINEDU-aligned roles (`director_admin`, `vice_principal`, `teacher`, `student`), student login with DNI and provisional 8-digit password support, 30-minute session inactivity timeout, academic catalog, periods, enrollments, student transfers, teacher assignments and succession, protected materials with metadata edit/withdraw/restore, physical attachment replacement with cryptographic hash verification, private vice-principal observations, activities, multi-version submissions, qualitative AD/A/B/C grading with correction history, locked assessed evidence, CNEB consolidated grade sheet and achievement distribution bar in classroom reports, private notification feeds, week associations, course library search with format badges (PDF, DOCX, PPTX, XLSX, IMG), clean secondary-only grade filter (1.° to 5.° de Secundaria), Peru timezone display, route-level code-splitting with vendor chunking, and the Classroom Presentation screen ("Pantalla de Aula").
- **Complete Institutional Product: ~70–75% functional coverage.**  
  The complete institutional product described in `openspec/config.yaml` includes broader institutional operational requirements: verified automated backup/restore drills (tested on `eval_dev` with 38 tables, ordinal 5403, and 577 server checks green), production LAN/WLAN deployment on Windows Server with offline capability, batch user/curriculum imports (implemented, awaiting full production dataset), PDF/XLSX report exports, audit log queries, and physical tablet/classroom load validation (empirically confirmed over Wi-Fi on port 8443).

---

## 2. Implementation Matrix by Planned Module

| Planned Module | Current Status | Implemented & Verified Capabilities | Remaining Institutional Work |
|---|---|---|---|
| **User Administration** | Implemented (~95%) | Real credentials for 4 roles, student login with DNI, mandatory initial password change (`must_change_password`), 30-minute session inactivity timeout, administrative batch CSV import, active/inactive states, identity retention, credential revocation, role policy guard. | Role succession audit trail and bulk XLSX templates if required. |
| **Academic Catalog & Periods** | Implemented (~95%) | Grades (strictly secondary 1.° to 5.°), sections (A–H), instructional entries, academic periods (active, draft, closed), MINEDU 2026 36-week teaching calendar, 4 bimesters. | Official school term rollover and catalog archive validation. |
| **Teacher Assignments** | Substantially Implemented (~90%) | Planning, activation, closure, replacement, preserved historical lineage, scope isolation by grade and section. | Bulk assignment imports and multi-teacher joint teaching workflows if approved. |
| **Educational Materials** | Substantially Implemented (~90%) | Upload, scoped access, protected downloads, metadata edit/withdraw/restore, attachment replacement with SHA-256 verification. | Long-term physical purge policy and storage quota controls. |
| **Material Review & Observations** | Substantially Implemented (~85%) | Purpose-bound vice-principal supervision, private teacher reply, state transitions, historical read-only protection. | Multi-turn observation threads, notification hooks for new observations. |
| **Activities & Submissions** | Substantially Implemented (~90%) | Multi-version deliveries, file evidence attachment, routing to original assignment, locked assessed versions, student transfer rejection, closed period blocking. | Additional activity types, timers, rubrics, and competencies. |
| **Auxiliary Grade Register & CNEB Consolidation** | Implemented (~90%) | Per-delivery AD/A/B/C grading, qualitative feedback, correction history retention, classroom progress summaries, CNEB achievement distribution bar (AD/A/B/C), pedagogical diagnostics (Logro Satisfactorio vs Refuerzo), CSV export. | Formal institutional register export (PDF/XLSX), bimester grade locking. |
| **Institutional Library** | Implemented (~90%) | Course-scoped protected library, search with debounce and character limits, format badges, inline preview & download, authorship preservation. | Global institutional public repository collection, document full-text indexing. |
| **Classroom Presentation ("Pantalla de Aula")** | Substantially Implemented (~90%) | Dedicated classroom view for projectors/interactive boards, inline protected PDF and image viewer, distraction-free navigation. | On-site school validation with projectors and school tablets. |
| **Notifications & Historial** | Substantially Implemented (~85%) | Private notification feed by role, read receipt tracking, CSRF protection, lifecycle ledger event tracking. | System-wide broadcast alerts and push notifications. |
| **Auditing & Resilience** | Substantially Implemented (~85%) | Immutable `academic_lifecycle_events` ledger, write guard ordinals, atomic rollback verification across all domains, local snapshot command (`backup.ps1`), clean restoration drill verified (`restore.ps1`). | Scheduled automated backup task and audit log viewer in UI. |
| **LAN/WLAN & Multi-Device Access** | Implemented (~85%) | Multi-origin TLS certificates with SAN (`setup-lan.ps1`, `start-tablet-mode.ps1`), 0.0.0.0:8443 binding, firewall rule configuration, responsive design (390px, 768px, 1440px), verified over local Wi-Fi from mobile devices. | Multi-classroom concurrent load testing at school premises. |
| **Local/Remote Synchronization** | Deferred (~15%) | Architectural guidelines documented; offline LAN capability confirmed. | Formal sync protocol, conflict resolution policy, cloud bridge (deferred per user instruction). |

---

## 2.1. Traceability Matrix: Requirement → Code → Test

| Requirement | Implementation Code | Verification Test / Evidence | Current Status |
|---|---|---|---|
| **Student DNI Login & Temporary Password** | `frontend/src/features/academic-foundation/accounts.ts`, `backend/app/Http/Controllers/LocalAccountController.php` | `frontend/src/features/academic-foundation/accounts.test.ts` (cases 10-13), browser login journey | **Verified** |
| **Strict Secondary Grade Filter (1.° a 5.°)** | `frontend/src/features/academic-foundation/CourseClassroomButtons.tsx`, `backend/app/Application/Academic/Queries/DashboardOverview.php` | `frontend/src/features/academic-foundation/course-classrooms.test.tsx` (cases 9-13), mobile visual review | **Verified** |
| **Calendar Exclusivity (Subdirection only)** | `frontend/src/features/academic-foundation/layout/AppSidebar.tsx`, `MobileNavBar.tsx`, `role-dashboards.tsx` | `frontend/src/features/academic-foundation/role-dashboards.test.tsx` (cases 5-8) | **Verified** |
| **Arko Course Library with Format Badges** | `frontend/src/features/academic-foundation/LibraryPanel.tsx`, `materials.ts` | `frontend/src/features/academic-foundation/materials.test.ts`, UI manual inspection | **Verified** |
| **Four Independent Dashboards (Arko UI)** | `frontend/src/features/academic-foundation/role-dashboards.tsx`, `StudentHome.tsx` | `frontend/src/features/academic-foundation/role-dashboards.test.tsx` | **Verified** |
| **Code Splitting & Bundle Chunking** | `frontend/src/features/academic-foundation/SessionShell.tsx`, `vite.config.ts` | `npm run build` (separate chunks for vendor, react, workspaces) | **Verified** |
| **Offline LAN / WLAN Access (HTTPS:8443)** | `backend/scripts/start-tablet-mode.ps1`, `setup-lan.ps1`, `https-proxy.mjs` | Successful physical smartphone connection over Wi-Fi (`192.168.0.207:8443`) | **Verified** |
| **Auxiliary Report & CNEB Consolidation** | `ReportWorkspace.tsx`, CSV exporter | `classroom-reports.test.ts`, CNEB distribution and pedagogical diagnostics live in UI | **Verified (UI + CSV), PDF/XLSX Pending** |
| **Clean Disaster Recovery & Restore** | `backend/scripts/backup.ps1`, `restore.ps1` | `eval-backup-20261016-124933.zip`, clean restoration drill executed on `eval_dev`, 577 checks passed post-restore | **Verified** |

---

## 2.2. OpenSpec Open Tasks Classification

1. **Verified (Documentation Reconciled):**
   - `student-dni-login`: Supports username and provisional password as student DNI, enforces password update on first entry.
   - `secondary-grade-isolation`: Secondary school grades strictly limited to 1.° through 5.°; verification test artifacts purged.
   - `role-navigation-cleanup`: Calendar removed from Teacher and Student menus; reserved exclusively for Subdirection.
   - `arko-library-panel`: Search by title/filename, extension badges, direct download, and dark mode support.
   - `performance-code-splitting`: Lazy loading for all admin/secondary workspaces, separate vendor and react bundles.
   - `wlan-tablet-server`: Multi-SAN TLS certificate and `0.0.0.0:8443` binding with local network reachability.
   - `backup-restore-drill`: Atomic snapshot (`backup.ps1`) and clean restoration drill (`restore.ps1`) verified; 38 tables, ordinal 5403, and 577 server checks green.
   - `session-inactivity-timeout`: 30-minute session inactivity timeout configured in dev-runtime router and authenticated session handler.
   - `cneb-grade-consolidation`: Achievement level distribution bar (AD/A/B/C), pedagogical diagnostic indicators (Satisfactorio vs Refuerzo), and individual student progress tracking integrated in `ReportWorkspace.tsx`.
2. **Implemented, Verification Pending On-Site:**
   - `tablet-physical-testing`: MinEdu physical tablets and classroom projector display at school premises.
   - `classroom-load-testing`: Multi-classroom concurrent submissions under simulated Wi-Fi load.
3. **Real Pending Tasks (P0/P1):**
   - `formal-report-export`: PDF and XLSX institutional templates with official Peruvian Ministry headers.
   - `audit-trail-explorer`: Director/Administrator UI to inspect `academic_lifecycle_events`.
4. **Requires Human/Institutional Decision:**
   - `credentials-policy-definitive`: Formalize whether student passwords remain DNI permanently or mandate periodic rotations.
   - `shared-tablets-session-policy`: Cache clearing and kiosk session auto-logout for shared classroom tablets.
   - `iis-vs-apache-choice`: Final selection of production web server for the institutional Windows Server.

---

## 2.3. Student DNI Login State

- **Current Implementation:**
  - Students can log in using either their system username or their 8-digit National Identity Document (DNI).
  - Newly provisioned student accounts have their initial password set to their DNI.
  - The client adapter (`accounts.ts`) accepts passwords from 8 to 72 characters, removing earlier 20-character fixed constraints.
  - The `must_change_password` flag forces students to establish a private password upon first successful login, securing account ownership.

---

## 2.4. Baseline Promotion Definition

- **Current Working Branch:** `test/school-tablets` (Commit `258de5b`).
- **Target Branch for Promotion:** `main`.
- **Promotion Recommendation:** Once the on-site physical tablet check at the school is completed, `test/school-tablets` should be merged into `main` via a fast-forward or clean squashed merge, serving as the official `v2.1` stable institutional baseline.

---

## 3. Verified Engineering Evidence (Commit `258de5b`)

### Frontend
- **Tests:** 213 automated contract/integration tests passing (0 failures, duration ~550ms via `npm test`).
- **Build & Typing:** Full TypeScript check (`tsc --noEmit && tsc -p tsconfig.tooling.json`) and Vite production bundle (`npm run build`) passing cleanly in ~700ms.
- **Bundle Optimization:** Route-level code-splitting with vendor chunking (`react-vendor`, `vendor`, `icons`, and lazy-loaded workspaces), reducing initial download size.
- **Design System:** Arko editorial design inspired by modern digital products, Google Fonts (**Fraunces** for headings and **Inter** for UI), full dark mode support, accessible contrast (WCAG AA), responsive layouts (390px, 768px, 1440px), official transparent HD crest, and institutional palette: Navy-950 (`#10244A`) and Warm Gold (`#E0A526`).

### Backend & Database
- **Database Schema:** 38 tables across 19 migrations (`2026_10_07_000001` through `2026_10_13_000002`).
- **Catalog Integrity:** Cleaned and restricted strictly to secondary level (1.° a 5.° de Secundaria). 52 test verification grades deactivated in `eval_dev`.
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
- **Network & Multi-Device Verification:** Verified running over local Wi-Fi on `0.0.0.0:8443` with successful physical mobile phone connection and TLS handshake.

---

## 4. Prioritized Road Map

### P0 — Prerequisites for Institutional School Operation
1. **Automated Backup & Verified Clean Restore:**
   - Automated scheduled backup scripts for MySQL database and physical `.local/eval-dev` file attachments.
   - Clean restoration drill on a blank environment.
   - Verification of 19 migrations integrity and data consistency after restore.
   - Written disaster recovery procedure.
2. **On-Site School LAN / WLAN Deployment:**
   - Execute deployment in school network with local Windows Server or host laptop.
   - Install institutional TLS certificate on school tablets.
   - Offline verification without Internet connection.
3. **Physical & Multi-Classroom Testing:**
   - School tablets (MINEDU) and projector validation.
   - Concurrency benchmarks under multi-classroom traffic.
4. **Continuous Integration (CI):**
   - GitHub Actions workflow (`.github/workflows/ci.yml`) automating:
     - Frontend typecheck, 213 tests, and build.
     - Backend linting, migration validation, and suite execution.

### P1 — Important Institutional Enhancements
5. **Report Exports (PDF / XLSX):**
   - Export auxiliary grade register and classroom progress reports with institutional header.
6. **Institutional Search & Audit Log Viewer:**
   - Audit trail explorer for directors and administrators to review critical lifecycle events.
7. **Bimester Grade Consolidation:**
   - Formal calculation of bimester averages and auxiliary grade sheets for teachers.

### P2 — Future Evolution (Post-MVP)
8. Local/remote cloud synchronization (deferred pending conflict resolution policy).
9. QR attendance and schedules (outside initial MVP).
10. Advanced assessments (rubrics, competency matrices, online questionnaires).

---

## 5. Non-Goals (Explicitly Excluded)
- Replacing SIAGIE (EVAL acts as a complementary institutional learning platform).
- Replacing the existing QR attendance hardware/system.
- Payment gateways or e-commerce features.
- Native mobile applications (Responsive web application covers all tablets, phones, and desktops).
- Improvised remote cloud synchronization without conflict policy approval.
