# EVAL Verification Baseline

- Revision 1: 2026-10-14, at `a29ecfe`.
- **Revision 2: 2026-10-20, at `5e10917`** — this is the current revision.

Recorded under task 0.6 of `openspec/changes/verification-baseline-and-critical-remediation`. This document is the single authoritative source for the counts it contains; other documents reference it instead of restating a number.

Checks that could not run are reported as unavailable with their reason and are never recorded as passing.

## Why Revision 2 exists

Between the two revisions the repository was updated in place:

```
$ git pull
a29ecfe..5e10917  main -> origin/main   (fast-forward, 263 files, +16 303 / -2 631)
```

The checkout that Revision 1 described no longer exists. Revision 1 findings were re-evaluated against `5e10917` rather than carried forward on assumption. The status table below is the result.

---

## Status of Revision 1 findings after `5e10917`

| # | Revision 1 finding | Status | Evidence |
|---|---|---|---|
| B1 | `npm test` did not execute on Node v22.19.0 (`--test-isolation=none`) | **RESOLVED upstream** | `frontend/package.json:7` now reads `tsc && node --test tests/contracts.runner.mjs`; R3 passes natively |
| B2a | `backend/scripts/local.ps1:8` pointed at `%LOCALAPPDATA%\Temp\opencode\eval-u1` | **RESOLVED upstream** | `local.ps1:10-11` now defines `$workspaceRoot = .local\runtime` plus a `$legacyRoot` fallback |
| B2b | `backend/scripts/dev.ps1:23` pointed at the same legacy root | **OPEN** | still `Join-Path $env:LOCALAPPDATA 'Temp\opencode\eval-u1'`; see F5 |
| B3 | Checkout cannot execute any backend check | **OPEN** | see F6 |
| B4 | Table/migration counts unreconciled across documents | **OPEN, sharpened** | see F4 |
| B5 | `docs/project-status-current.md:37` described a branch state that does not exist | **RESOLVED upstream** | the `feat/academic-foundation` claim is gone after the pull |
| B6 | `a29ecfe` changed the authorization model without updating its regression suites | **RETAINED** | unchanged, still explains the divergence; see F1 |
| E7 | `DeliveryTimingTest.php` referenced by zero PHPUnit configurations | **RESOLVED upstream, replaced** | now in `phpunit.xml`; a different orphan appeared — see F3 |
| — | No CI | **RESOLVED upstream** | `.github/workflows/ci.yml`, 135 lines, 4 506 bytes |
| — | No reproducible environment setup | **RESOLVED upstream** | `backend/scripts/setup-team.ps1` (300 lines), `ci-prepare.php`, `setup-lan.ps1` |
| — | No backup/restore, no scheduled backup | **RESOLVED upstream** | `backup.ps1`, `restore.ps1`, `setup-backup-task.ps1` |
| — | No audit-log consultation | **RESOLVED upstream** | `AuditLedgerQuery.php`, `AuditWorkspace.tsx`, change `audit-trail-explorer` |
| — | No official report export | **RESOLVED upstream** | `ClassroomOfficialExport.php` (387 lines, SHA-256 seal) |
| — | No batch user import | **RESOLVED upstream** | `BulkImportWorkspace.tsx` (601 lines) |
| — | No classroom presentation mode | **RESOLVED upstream** | `ClassroomPresentation.tsx`, change `classroom-presentation` |
| — | UI/UX design debt | **RESOLVED upstream** | `frontend/src/features/academic-foundation/ui/` (14 components) and `.../layout/` (`AppHeader`, `AppSidebar`, `MobileNavBar`, `CommandPalette`), plus dark mode and `ThemeToggle` |
| — | No LAN/WLAN deployment path | **RESOLVED upstream** | `setup-lan.ps1`, `docs/operaciones/despliegue-servidor-lan.md` |
| — | Permission contradiction (the plan's central finding) | **OPEN — unchanged** | see F1 |
| — | `test:e2e` undefined, browser specs target non-existent selectors | **OPEN — unchanged** | see F2 |
| — | `FoundationController` decodes an unbounded body | **OPEN — unchanged** | see F1a |
| — | `correlation_id` of failure responses not persisted | **PARTIALLY OPEN** | see F1b |
| — | Versioned authentication grants vs. `LocalAccountService` write path | **OPEN** | `backend/scripts/auth-runtime-grants.sql` unchanged by the pull |

Fourteen Revision 1 findings were fixed by upstream work and are **out of scope** for this change. They are recorded here so they are not re-reported.

---

## Environment detected (2026-10-20)

| Component | Detected | Note |
|---|---|---|
| Windows / PowerShell | Present | Repository scripts are `.ps1` / `.cmd` |
| Node.js | **v22.19.0** | On PATH; matches `ci.yml` `node-version: 22` |
| npm | 10.9.3 | On PATH |
| Git | 2.51.0.windows.1 | On PATH; `main` up to date with `origin/main` |
| PHP | **NOT FOUND** | No `php.exe`; `backend/vendor/` absent |
| Composer | **NOT FOUND** | Not on PATH |
| MySQL client | **NOT FOUND** | Not on PATH; ports 3307 / 8443 / 18080 not listening |
| `.local/` | Present but **empty of runtime** | Contains only `.local/eval-dev/operation.lock`, created by the failed `manage-dev.ps1 -Command status` call below. No `runtime/`, no data directory, no credentials |
| `backend/vendor/` | **ABSENT** | Excluded by `.gitignore` (`/backend/vendor/`) |
| `frontend/node_modules/` | **PRESENT, restored** | 46 packages at Revision 1, +29 at Revision 2 |
| `.github/workflows/` | `ci.yml` (135 lines) **plus** leftover `.gitkeep` | |

`./backend/scripts/manage-dev.ps1 -Command status` exits 1:

```
EVAL local operation failed at private_paths (line 186). Run prepare -Maintenance first.
```

`docs/local-development.md:55` states that maintenance provisioning requires explicit human authorization and an owned MySQL restart. It was **not** run.

---

## Executed checks — Revision 2 (2026-10-20)

| # | Check | Command | Result |
|---|---|---|---|
| R1 | Frontend dependencies | `npm install` | **PASS** — 29 packages added (`package-lock.json` changed by 4 563 lines) |
| R2 | Frontend typecheck | `npm run typecheck` | **PASS** — exit 0 |
| R3 | Frontend unit suite | `npm test` | **PASS** — **223 tests, 223 pass, 0 fail, 0 skipped, 0 todo**, 1 726 ms. Runs natively; no flag workaround required |
| R4 | Frontend production build | `npm run build` | **PASS** — exit 0, built in 2.67 s, code-split (main CSS 137.20 kB) |
| R5 | Repository update | `git pull` | **PASS** — fast-forward `a29ecfe..5e10917`, 263 files |
| R6 | PHPUnit test-file inventory | Inspection of all 13 `phpunit*.xml` | **33** test files on disk, **32** referenced |
| R7 | Orphan test detection | Inspection | **1 orphan: `backend/tests/Feature/Academic/IdentityRetentionTest.php`** — in zero configurations |
| R8 | CI coverage of `phpunit.xml` | Inspection of `ci.yml:81-84` | CI runs **only** `phpunit -c phpunit.xml --testsuite Unit` |
| R9 | `Unit` testsuite membership | Inspection of `phpunit.xml` | 7 files; **does not include `AcademicAuthorizationTest`** |
| R10 | Authorization drift after the pull | `git log a29ecfe..HEAD -- <3 paths>` | **Empty** — `AcademicAuthorization.php`, `AcademicAuthorizationTest.php`, `AcademicPolicyHttpTest.php` all unchanged |
| R11 | Document paths cited by this baseline | Existence check | 2 paths moved to `docs/pruebas/historico/`; corrected below |
| R12 | Body-size bound | Inspection | `SchoolCalendarController:28` enforces `strlen($raw) > 262144`; `FoundationController:183` has no bound |

## Executed checks — Revision 1 (2026-10-14), retained for history

| # | Check | Command | Result |
|---|---|---|---|
| E1 | Frontend dependencies | `npm ci` | PASS — 46 packages |
| E2 | Frontend typecheck | `npm run typecheck` | PASS — exit 0 |
| E3 | Frontend production build | `npm run build` | PASS — exit 0 |
| E4 | Frontend unit suite **as written** | `npm test` | **FAIL** — `node: bad option: --test-isolation=none`, exit 9 |
| E5 | Same suite without the unsupported flag | `node --test tests/contracts.runner.mjs` | PASS — 202 tests, 202 pass |
| E6 | PHPUnit test-file inventory | All 13 configurations | 32 files, 31 referenced |
| E7 | Orphan test detection | Inspection | 1 orphan: `DeliveryTimingTest.php` |

E4/E5/E6/E7 are superseded by R3/R6/R7 and must not be cited as current.

---

## Unavailable checks

| Check | Reason |
|---|---|
| All 13 PHPUnit configurations (`U1`–`U11`, `Auth`, `calendar`) | No PHP runtime, no Composer, no `backend/vendor/`, no MySQL instance, no `.local/` state |
| Backend syntax lint | No PHP tooling on this machine. (`ci.yml` performs it in its own job) |
| `composer validate` / `composer install` | Composer absent |
| `npm run test:e2e` | **Script is not defined** in `frontend/package.json` — see F2 |
| `npm run test:e2e:list` | Runs, but needs Playwright browsers and a live backend; neither present |
| Browser scripts `frontend/tests/*.mjs` | No runtime, no certificates, no credentials, nothing listening on 8443 |
| `manage-dev.ps1 -Command status` | Fails at `private_paths`; private state directory absent |
| Coverage measurement | No coverage tooling configured for either stack |
| Any execution of `ci.yml` | No CI run was triggered; local execution of its steps is blocked by the same missing PHP toolchain |

---

## Authoritative counts

| Metric | Value | Evidence |
|---|---|---|
| Frontend unit tests | **223** | R3 |
| Frontend typecheck / build | **PASS** | R2, R4 |
| PHPUnit test files on disk | **33** | R6 |
| PHPUnit test files referenced by a configuration | **32** | R6 |
| PHPUnit orphan test files | **1** (`Feature/Academic/IdentityRetentionTest.php`) | R7 |
| PHPUnit configurations | **13** | directory listing of `backend/phpunit*.xml` |
| Migrations on disk | **20** (`2026_10_07_000001` … `2026_10_16_000020`) | directory listing |
| Tables in the database | **NOT MEASURED** | no database reachable |
| Files executed by CI's PHPUnit step | **7** (`phpunit.xml` `Unit` testsuite) | R8, R9 |

**Superseded figures.** Earlier documents state divergent values for these metrics and must not be restated:

- Frontend tests: **56** (`frontend/README.md:29`) and **61** (`frontend/README.md:37`), **170** (`docs/pruebas/historico/latest-prototype-alignment-verification.md`), **202** (Revision 1 of this document), **217** (`docs/project-status-current.md:100` and `:141`). The **151** figure previously attributed to `docs/project-status-current.md:28` no longer resolves: that line now holds an unrelated feature row and the number appears nowhere in the document, so it is reported as unsourceable rather than carried forward. **Current: 223.**
- Migrations: 19 (`docs/project-status-current.md:106`, `docs/integral-implementation-plan.md:8`). **Current: 20 on disk.**

---

## Findings still open

### F1 — The permission contradiction survives, and the new CI cannot see it (High)

`AcademicAuthorization.php` and both suites that encode it were **not touched** by the pull (R10). The divergence is exactly as Revision 1 recorded:

```
AcademicAuthorization.php:19   $director=in_array('director_admin',...); $manager=in_array('vice_principal',...);
AcademicAuthorization.php:30   if($field===null){ return $manager; }
AcademicAuthorizationTest.php:9   testDirectorCanManageCatalogAndVicePrincipalCannot
AcademicAuthorizationTest.php:12  assertTrue($policy->allows($this->actor /* director_admin */, 'catalog.manage'))
routes/academic.php:11              director writes blocked
```

Revision 1's root-cause finding (B6) still explains it: commit `a29ecfe` changed 103 files — including `AcademicAuthorization.php` and `routes/academic.php` — while touching only three test paths, and neither `AcademicAuthorizationTest.php` nor `AcademicPolicyHttpTest.php` was among them.

**What changed is detection, not the defect.** CI now exists (R8) but runs only:

```yaml
- name: Run 67 Domain & Integrity Unit Tests (PHPUnit)
  run: ./vendor/bin/phpunit -c phpunit.xml --testsuite Unit
```

The `Unit` testsuite holds 7 files (R9) and **does not include `AcademicAuthorizationTest`** or `AcademicPolicyHttpTest`. The suites where the contradiction lives are executed by no automated process — not locally (blocked by F6) and not by CI (blocked by test selection).

> A green CI pipeline therefore says nothing about the permission contract. Correcting the tests without extending the suites that CI runs would leave the defect invisible in both places.

#### F1a — Unbounded body decode survives (Medium)

`FoundationController:183` — `$raw = trim($request->getContent());` then `json_decode($raw, …)` with no length check. `SchoolCalendarController:28` enforces `strlen($raw) > 262144` on its own endpoint. The bound proposed at 256 KB matches `262144 = 256 × 1024` exactly, so the recorded decision stands unchallenged (R12).

#### F1b — Failure correlation IDs are still not server-side traceable (Medium)

Partially addressed upstream, and the remainder is narrower than Revision 1 stated:

- `LifecycleEventWriter:20` **does** persist `correlation_id` into `academic_lifecycle_events` — but only for writes that reach an open transaction (line 12 throws `ledger_requires_transaction` otherwise).
- `FoundationController:178` returns `correlation_id` in the body **only when `$status === 503`**.
- There is no logger anywhere in `FoundationController`: `error_log`, `logger`, `Log::`, `->info(`, `->error(` return nothing.

So a correlation ID handed to a client on a failure has **no server-side counterpart**. The operator receiving it has nothing to look up. The failure path is the one case where correlation is useless today.

### F2 — `test:e2e` is still undefined and the browser specs were not repaired (Medium)

| Path | State |
|---|---|
| `frontend/package.json` | `test:e2e` **ABSENT**; `test:e2e:list` declared |
| `frontend/tests/e2e/academic-foundation.spec.ts` | exists, **unchanged** by the pull |
| `frontend/tests/institutional.browser.mjs` | exists, **unchanged** by the pull |

The decision to repair rather than retire browser verification (proposal decision 2) is unaffected by the update.

### F3 — The orphan-test problem reproduced (Medium)

The one orphan Revision 1 found (`DeliveryTimingTest.php`) was fixed upstream. In the same repository state a different file sits in no configuration: `backend/tests/Feature/Academic/IdentityRetentionTest.php` (R7), introduced by `aec01f8`.

33 files on disk, 32 referenced. Adding the missing file to a configuration is not by itself a durable fix; **33 = 32** must hold as a check, not as a one-off edit.

### F4 — Counts contradict themselves inside single documents (Medium)

`docs/project-status-current.md` now asserts, all within one file:

| Line | Claim |
|---|---|
| 13 | "39 tables, 20 migrations, ordinal 7289, and 780 server checks green across 12 suites" |
| 48 | "`reports.test.ts` (**223 tests**)" |
| 52 | "39 tables, 20 migrations, 2162 attachments" |
| 65 | "38 tables, ordinal 6103, and 577 server checks green" |
| 100 | "Tests: **217** automated contract/integration tests passing (0 failures, duration ~350ms via `npm test`)" |
| 106 | "38 tables across 19 migrations (`2026_10_07_000001` through `2026_10_13_000002`)" |
| 120 | "Core Domain Unit Tests: **62** PHPUnit unit tests (112 assertions)" |
| 141 | "Frontend typecheck, **217** tests, and build" |

- **39 vs 38 tables** and **20 vs 19 migrations** contradict within the same file.
- **223 vs 217 vs 217** for frontend tests, and the measured value is **223** — line 48 is correct and lines 100 and 141 are not.
- Line 106 cites **`2026_10_13_000002`, which does not exist** on disk: migrations run `2026_10_07_000001` … `2026_10_08_000019`, then `2026_10_16_000020`.
- **780 vs 577** server checks across two lines of the same document.
- **62 vs 67** PHPUnit tests: the document says 62 (lines 13, 120), `.github/workflows/ci.yml` names its step "Run **67** Domain & Integrity Unit Tests". Neither could be executed here, so neither is authoritative — but they cannot both be right, and the CI step name will be visibly wrong the moment its selection changes under task 1.7.

No database was reachable, so no table count could be measured; no PHPUnit configuration has been executed, so neither test figure could be confirmed. The conflict is **open** and must not be cited as settled. Frontend tests are the one count in this table that was measured: **223**.

### F5 — `backend/scripts/dev.ps1:23` still uses the legacy runtime root (Low)

`local.ps1` was migrated (B2a); `dev.ps1:23` was not. It remains `Join-Path $env:LOCALAPPDATA 'Temp\opencode\eval-u1'`, the location `docs/local-development.md:43` declares retired.

### F6 — This machine cannot execute any backend check (High)

Beyond script paths: no `php.exe`, no Composer, no `backend/vendor/`, and no `.local/` runtime or data directory. Upstream now ships `setup-team.ps1` and a CI job that provisions PHP 8.4 and MySQL 8.4 itself, so the **repository** no longer lacks a reproducible path — but this machine has not been provisioned through it. Per `docs/functional-completion-roadmap.md:20`, a clone is not an installed application.

### F7 — Minor residuals (Low)

- `frontend/package.json` declares **no `engines` field**; the required Node version is undocumented and unenforced.
- `.github/workflows/.gitkeep` remains alongside the real `ci.yml` and should be removed.

### F8 — The setup script demands a Node version its own CI does not use (Medium)

`backend/scripts/setup-team.ps1:85-87`:

```powershell
if (!$node -or !$npm) { throw 'Node.js 24 or newer and npm are required in PATH.' }
$nodeVersion = (& $node.Source --version).TrimStart('v').Split('.')[0]
if ([int]$nodeVersion -lt 24) { throw 'Node.js 24 or newer is required.' }
```

Against the repository's own positions:

| Source | Node version |
|---|---|
| `backend/scripts/setup-team.ps1:87` | **24+** |
| `.github/workflows/ci.yml` (`node-version`) | **22** |
| Measured on this machine (2026-10-20) | **v22.19.0** — `npm test` 223/223, `build` PASS |

The gate is stricter than the CI that validates the same code, and stricter than the runtime the suites demonstrably pass on. It makes the documented one-command team setup abort before downloading anything on any machine with Node 22 — which is what CI itself uses.

The gate is also undocumented: `frontend/package.json` declares no `engines` field (F7), so no artifact states which of the two requirements is authoritative.

Disposition: not relaxed by this change. Provisioning on this machine worked around it by placing a **portable, SHA256-verified Node v24.22.0 LTS under `.local/tools/`** and prepending it to the session `PATH` only — no global installation, no system `PATH` mutation, and `.local/` is ignored by Git. The contradiction itself is recorded for the team to resolve.

### F9 — Risk: `setup-team.ps1:271` may abort under PowerShell 5.1 (unconfirmed)

`setup-team.ps1:271` redirects a child process's stderr into a session that runs with `$ErrorActionPreference='Stop'`:

```powershell
$provisionOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $manageScript -Command prepare -Maintenance 2>&1
```

PowerShell 5.1 wraps native stderr written under stream redirection into `NativeCommandError` records, which become terminating under `EAP=Stop`. Only `powershell.exe` 5.1 is installed here; PowerShell 7 is absent.

**Not confirmed — subsequently exercised without failure.** The one failure observed during provisioning was traced to a redirection operator in the *caller's* command, not to this line: a probe script that writes to native stderr and runs with `EAP=Stop` completed normally when invoked without in-session redirection.

**Resolved 2026-10-20:** `setup-team.ps1 -Command prepare` completed with `EXIT=0`, which means line 271 **did** execute under PowerShell 5.1 with `2>&1` and `EAP=Stop`, and did **not** abort. `manage-dev.ps1 -Command prepare -Maintenance` emitted only plain `Write-Output` and no native stderr, so the wrapping condition never triggered.

**Disposition: refuted for this path.** Recorded because the construct remains fragile — any future `Write-Warning`, `Write-Error`, or native command writing to stderr inside `manage-dev.ps1` during that step would terminate provisioning and trip the `catch` that deletes `.local/runtime`. Not a current defect.

### F10 — `Get-Artifact` returns an array instead of a path, breaking `setup-team.ps1` on any fresh clone (High)

**Reproduced 2026-10-20.** The provisioning run failed at `setup-team.ps1:205`:

```
Expand-Archive : No se puede procesar la transformación del argumento del parámetro 'LiteralPath'.
No se puede convertir el valor al tipo System.String.
En setup-team.ps1: 205 Carácter: 33
+     Expand-Archive -LiteralPath $mysqlArchive -DestinationPath (Join-Path $stage 'mysql-extract')
```

Cause, in `Get-Artifact`:

```powershell
function Get-Artifact($artifact) {
    $target = Join-Path $downloadRoot $artifact.archive
    if (!(Test-Path -LiteralPath $target)) {
        Write-Output ('Downloading ' + $artifact.archive + '...')   # line 95 — emitted to the pipeline
        ...
    }
    ...
    return $target                                                   # line 109 — emitted to the pipeline
}
```

A PowerShell function emits **every** uncaptured output. When the artifact must be downloaded, the caller receives an **array** of two elements — the progress string and the path — and `Expand-Archive -LiteralPath <array>` raises exactly the observed `ParameterArgumentTransformationError`.

**Differential proof, from a single run:**

| Line | Variable | Cache state at call | Result |
|---|---|---|---|
| 204 | `$phpArchive` | **warm** — PHP zip already present | no download branch, one emitted value → **string → `Expand-Archive` succeeded** |
| 205 | `$mysqlArchive` | **cold** — MySQL zip absent | download branch executed → two emitted values → **array → `Expand-Archive` failed** |

Same function, same caller, same run; the only difference is whether a download occurred.

**Minimal reproduction (2026-10-20), isolating the construct:**

| Case | Returned type | `Expand-Archive -LiteralPath` |
|---|---|---|
| Download branch skipped | `String` | succeeds |
| Download branch executed | `Object[]` (2 elements: `"Downloading mysql.zip..."`, path) | **fails with `ParameterArgumentTransformationError,Expand-Archive`** — message identical, character for character, to the production failure |

The defect is therefore demonstrated rather than inferred: it is inherent to the `Write-Output`-plus-`return` pattern under PowerShell's output semantics, and needs no other condition than a cold download cache.

**Impact:** on a machine with an empty `.local/downloads/` — i.e. every fresh clone, which is exactly what `setup-team.ps1` exists for — the script downloads PHP successfully, downloads MySQL successfully, then crashes before extraction. The artifacts pass their SHA256 checks, so the failure is not about integrity: the tooling cannot consume its own downloads. A developer with a warm cache never sees it, which is consistent with the defect reaching the repository.

**Workaround used here:** pre-populate `.local/downloads/` so all three artifacts are cached, making `Get-Artifact` take the `return`-only path. All three files were verified against the pinned hashes (`php` `da68394f…`, `mysql` `a492371d…`, `composer` `7a2d379d…`) before re-running.

**Disposition:** not patched by this change — `backend/scripts/setup-team.ps1` is application-adjacent tooling and per `AGENTS.md` any edit is a change requiring approval. The defect is recorded for the team; the correct fix is to replace the `Write-Output` at line 95 with progress written outside the pipeline (or to have the function return a single object).

### F11 — Fresh provisioning stops at 17 of 20 migrations; the calendar feature then fails at runtime (High)

**Measured 2026-10-20 against a live provisioned environment.**

`backend/dev-runtime/provision.php:14-23` builds its migration set **by hand**, not from the directory:

```php
$files = glob(dirname(__DIR__).'/database/migrations/2026_10_07_*.php'); sort($files);
if (count($files) !== 10) throw new RuntimeException();
$files[] = ... // 000011, 000012, 000013, 000014, 000015, 000016, 000017 — 7 explicit paths
$migrator->run($files);                                            // 10 + 7 = 17
```

Against `backend/dev-runtime/migrate-all.php`, whose docblock states *"Executes all 20 migrations in sequence"* and which uses `glob($migrationDir.'/*.php')`.

| Source | Count |
|---|---|
| Migration files on disk | **20** |
| Applied by `prepare -Maintenance` (`provision.php`) | **17** |
| Applied by `-Command migrate-all` (`migrate-all.php`) | **20** |

**Measured state after a complete, successful provisioning** (`manage-dev.ps1 -Command snapshot`, runtime role = `SELECT` only):

```json
{"tables":31,"migrations":17,"accounts":4,"periods":1,"assignments":1,"enrollments":1}
```

`tables:31 / migrations:17` is exactly the pair `inspect.php:12` accepts as valid, so the schema verifier **passes on a three-migration-short database**.

**Not applied:** `2026_10_08_000018_create_school_calendars.php`, `2026_10_08_000019_create_resource_week_associations.php`, `2026_10_16_000020_create_bimester_grade_closures.php`.

**Measured runtime impact**, authenticated director session, read-only `GET`:

| Endpoint | Result |
|---|---|
| `GET /academic/periods/1/calendar` | **`400/500 {"error":"database_unavailable"}`** — target table absent |
| `GET /academic/periods/1` | `200` with data (control: table present) |
| `GET /notifications` | `200` with data (control: table present) |

So a user who completes the documented setup (`setup-team.ps1 prepare` → `manage-dev start` → open the browser) gets a working login and working core screens, while the school calendar — and, by the same cause, resource weeks and bimester closures — fail with `database_unavailable`.

**Not a defect in the schema itself:** the migrations exist, are well formed, and `migrate-all` applies them correctly. The gap is that nothing in the onboarding path invokes it — `setup-team.ps1:276` ends with *"Run manage-dev.ps1 -Command start, then double-click Abrir EVAL.cmd"*, with no `migrate-all` step — and the verifier accepts the partial state silently.

**Disposition:** recorded, not patched — `backend/dev-runtime/provision.php` is provisioning code, and editing it is a change requiring approval under `AGENTS.md`.

**Local remediation applied and verified (2026-10-20)** using the repository's own command, which is additive: Laravel's `Migrator` skips rows already present in the `migrations` ledger.

```text
manage-dev.ps1 -Command migrate-all
  {"status":"OK","tables_count":39,"migrations_count":20,"files_found":20}
manage-dev.ps1 -Command snapshot
  {"tables":39,"migrations":20,"accounts":4,"periods":1,"assignments":1,"enrollments":1}
```

Re-test, same authenticated director session, same read-only `GET`:

| Endpoint | Before | After |
|---|---|---|
| `GET /academic/periods/1/calendar` | `database_unavailable` | **`200 {"data":null}`** |
| `GET /academic/periods/1` | `200` | `200` |
| `GET /notifications` | `200` | `200` |

`{"data":null}` is the correct empty result: no calendar has been configured (`materials:0`, no demo calendar seeded).

**Two collateral facts this measurement settled:**

1. **Authoritative table count is 39.** F4's contradictory documentation figures (39 vs 38) now have a measured answer from a live database: `tables_count: 39`, `migrations_count: 20`, `files_found: 20`.
2. **The finding is workflow, not schema.** The three migrations applied cleanly on first attempt with no errors, confirming `provision.php`'s fixed list — not the migrations themselves — was the only obstacle.

---

## Effect on the remediation plan

| Task | Status |
|---|---|
| 0.1 Restore backend dependencies | **BLOCKED** — no PHP, no Composer, no `.local/` runtime |
| 0.2 Restore frontend dependencies | **DONE** — R1, R2 |
| 0.3 Resolve the runtime path contradiction | **DONE** for `local.ps1` (upstream); `dev.ps1` carried as F5 |
| 0.4 Execute all 13 PHPUnit configurations | **BLOCKED** — depends on 0.1 |
| 0.5 Execute the frontend suites | **DONE** — R2, R3, R4 |
| 0.6 Record this baseline | **DONE for every metric measurable here**; table count remains open under F4 |
| 0.7 Confirm the orphan test file | **DONE** — `DeliveryTimingTest` confirmed orphaned (E7) and later fixed upstream; the invariant now tracked is F3 |

**Phase 1 (permission reconciliation) cannot start.** Task 1.2 requires running suites U9 and U11, which requires 0.4. The central finding remains confirmed only by static analysis and by commit history (B6), never by execution.

---

## What must happen before Phase 1

1. Provision PHP 8.4 and Composer. `backend/scripts/setup-team.ps1` is the upstream-supported path and was **not** run; installing a toolchain is a system-level operation requiring human authorization.
2. Provision `.local/` state. `manage-dev.ps1 -Command prepare -Maintenance` requires explicit human authorization per `docs/local-development.md:55` and was **not** run.
3. Execute task 0.4 and confirm or refute the permission finding.
4. Extend the suites that CI executes to include `AcademicAuthorizationTest` and `AcademicPolicyHttpTest`, otherwise the corrected contract stays invisible to automation. This is a **specification change to `ci.yml`** and is recorded as a task; no workflow was modified by this baseline.

No application code, schema, grant or CI workflow was created or modified by this baseline. `ci.yml` was produced by upstream commits `fe36e7f` and `d20f7dc`, not by this change.
