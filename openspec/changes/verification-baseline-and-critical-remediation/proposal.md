# Verification Baseline And Critical Remediation

## Why

A static review of the current checkout found that the permission matrix is contradicted by its own regression suites, that two verification layers cannot run against the present code, and that operational hazards on the failure path have no guard.

The checkout changed under this proposal. On 2026-10-20 `git pull` fast-forwarded the repository from `a29ecfe` to `5e10917` (263 files, +16 303 / −2 631). Fourteen of the original findings were fixed by that update — the broken `npm test` command, the stale runtime path in `local.ps1`, the orphan `DeliveryTimingTest`, the stale branch claim, and the absence of CI, environment setup, backup/restore, audit consultation, report export, batch import, classroom presentation, UI design work and a LAN deployment path. Those are closed here without work and recorded in `docs/verification-baseline-2026-10-14.md` so they are not re-reported.

What survives the update, re-read rather than assumed at `5e10917`:

- **The permission contradiction is untouched.** `AcademicAuthorization.php:19,30` grants `catalog.manage` to `vice_principal` only, `routes/academic.php:11` denies every director write before any controller runs, and `AcademicAuthorizationTest.php:9,12,44,111` asserts the opposite. `git log a29ecfe..HEAD` is empty for all three files. The cause is known: `a29ecfe` changed 103 files including the authorization model while touching neither regression suite.
- **The new CI cannot see it.** `ci.yml:84` runs only `phpunit -c phpunit.xml --testsuite Unit`, a 7-file selection that excludes `AcademicAuthorizationTest` and `AcademicPolicyHttpTest`. A green pipeline says nothing about the permission contract.
- **The browser verification is broken at the model level, not the selector level.** `academic-foundation.spec.ts:61` expects the Director to hold `periods, catalog, enrollments, assignments` and the Vice Principal only `assignments`; `role-dashboards.tsx:8-12` gives the Director `reports, institution, history, audit, account` and the Vice Principal twelve sections. Lines 139-166 have the Director perform writes that `routes/academic.php:11` rejects unconditionally, so no selector alignment can make that test pass.
- **Availability and traceability remain open.** `FoundationController.php:183` and `LocalAccountController.php:15-16` decode request bodies with no length bound while `SchoolCalendarController:28` enforces 256 KB; `FoundationController.php:178` returns a `correlation_id` on 503 with no log anywhere in the controller, and the lifecycle ledger cannot record it because it requires an open transaction.
- **Counts still disagree.** `docs/project-status-current.md` states 39 tables (line 13) and 38 tables (line 65) and 19 migrations (line 106) in one file, cites `2026_10_13_000002` which does not exist, and gives frontend test counts of 223 (line 48) and 217 (lines 100, 141) against a measured 223; it claims 62 PHPUnit tests while `ci.yml` names its step "Run 67". Migrations on disk number 20. No database was reachable and no PHPUnit configuration has run, so those figures remain unmeasured rather than wrong-by-luck.
- Test reachability is a recurring defect, not a one-off: `DeliveryTimingTest` was orphaned, was fixed upstream, and `backend/tests/Feature/Academic/IdentityRetentionTest.php` is now the sole orphan (33 files, 32 referenced).

## Proposed change

Establish a reproducible, honestly reported verification baseline, then remediate the correctness and safety defects that the baseline exposes — the permission contract, its automated detection, the browser verification's authority model, the unbounded failure path, and test reachability. The change is verification-first: no application behavior is altered until the baseline is captured, and every remediation lands with a test that fails before the fix and passes after it.

## Intent

Make the permission contract trustworthy, make the critical-path verification executable, and remove the availability and traceability hazards, without broadening product scope or touching unresolved product decisions.

## Status and scope

No artifact in this change authorizes application code, schema, CI workflows, grants, or commits. Per `AGENTS.md`, requirements must be approved before implementation.

Evidence status at `5e10917`, stated per layer rather than as a single claim:

| Layer | Status |
|---|---|
| Frontend (typecheck, 223 unit tests, production build) | **Verified by execution** 2026-10-20 |
| Backend (13 PHPUnit configurations) | **Static only** — no PHP toolchain on this machine |
| Permission divergence | **Static plus commit-history corroboration** (`a29ecfe`); never executed |
| Browser/e2e suites | **Static only** — `test:e2e` undefined, no running instance, no Playwright browsers |
| CI pipeline | **Read, not run** — no CI execution was triggered |
| Database counts | **Not measured** — no database reachable |

### In scope

- Recording a reproducible baseline at `5e10917` and keeping it current (done to the extent this machine allows; the backend half remains blocked).
- Restoring local backend dependencies and recording a regression baseline for all 13 PHPUnit configurations.
- Resolving the director/vice-principal authority contradiction between `AcademicAuthorization` and its tests.
- Reconciling the director cases in the browser verification with that same recorded decision, and re-scoping the role model the e2e suite asserts.
- Extending the CI PHPUnit selection so the permission contract is executed automatically (gated on approval; see Exclusions).
- Bounding request body size on every JSON endpoint.
- Persisting the `correlation_id` of failure responses so a client-reported ID can actually be looked up server-side.
- Reconciling the authentication runtime grants with the account-writing code path, or documenting that path as development-only.
- Making test reachability an invariant: every test file is executed by some configuration.
- Repairing the browser and Playwright verification and defining an executable `test:e2e` script.

### Exclusions

- **Creating** a CI workflow. None is created here. `.github/workflows/ci.yml` was introduced by upstream commits `fe36e7f` and `d20f7dc`; task 1.7 would modify an existing job's test selection, and per `AGENTS.md` that modification requires the corresponding specification to be approved first. The task records the requirement; it does not authorize the edit.
- Authorization centralization across the ~15 classes that re-read roles independently. That is a larger, separately specified change (P1, R2.7).
- Request-body limits are in scope only as a bound; content-type policy, rate limiting beyond login, and CORS remain out of scope.
- Logging is limited to correlation and failure category. No log aggregation, retention, or shipping is proposed.
- Any change to role definitions, product boundaries, SIAGIE, QR attendance, or remote synchronization.
- Grants for `eval_dev` beyond reconciling the versioned authentication grants; no privilege broadening for production roles.
- The fourteen findings fixed upstream between `a29ecfe` and `5e10917`. They are recorded as resolved and are not re-opened by this change.
- Provisioning this machine with PHP, Composer or `.local/` state. Installing a toolchain and running `prepare -Maintenance` are system-level operations requiring explicit human authorization, and were not performed.

## Dependencies

- **Still required:** a runnable PHP 8.4 runtime, Composer, `backend/vendor/`, and the isolated MySQL instance declared in `docs/local-development.md`. None is present on this machine. `backend/scripts/setup-team.ps1` is the upstream-supported provisioning path and has not been run; installing a toolchain requires human authorization.
- **Still required:** explicit human authorization for `manage-dev.ps1 -Command prepare -Maintenance`, which `docs/local-development.md:55` states requires an owned MySQL restart.
- **Satisfied:** Node.js with npm. Measured 2026-10-20 — `npm install`, `typecheck`, `test` (223/223) and `build` all pass.
- **Resolved:** the runtime path contradiction. `backend/scripts/local.ps1` was corrected upstream and now prefers `<repo>\.local\runtime`; `backend/scripts/dev.ps1:23` still uses the retired root and is carried as finding F5.
- **Satisfied:** the director authority decision, recorded below. No decision remains open.

## Risks

1. **Baseline reveals wider failure.** If suites U9/U11 are red for reasons beyond the permission contradiction, scope may grow. Mitigation: the baseline is captured and reported before any fix, and expansion requires a new proposal.
2. **Re-scoping browser verification reduces or changes evidence.** Task 3.8 corrects director cases that currently assert writes succeeding against a code path that rejects them unconditionally. The correction is mandated by recorded decision 1, but it changes what the suite proves about director catalog management. Mitigation: it is flagged for human confirmation before implementation, and the before/after expectation set is recorded rather than silently rewritten. Retirement remains rejected as a separate, explicitly visible decision.
3. **Body-size bound breaks an existing client.** A limit below a payload currently in use would reject legitimate requests. Mitigation: the proposed 256 KB matches the already-enforced bound at `SchoolCalendarController:28` (`strlen($raw) > 262144` = 256 × 1024); no endpoint in the review produces larger payloads.
4. **Grant reconciliation widens database privileges.** Adding credential/role write grants increases blast radius if the runtime credential leaks. Mitigation: grants remain column-scoped and host-bound to `127.0.0.1`, matching the existing least-privilege pattern, and must be reviewed before application.
5. **Static findings may be incorrect.** The backend findings come from reading code, not running it, and no PHP toolchain exists here to test them. Mitigation: every task is written so its verification either confirms or refutes the finding; task 1.2 in particular is written to prove the static reading wrong if execution disagrees, and is reported as unavailable until it runs rather than as settled.
6. **The permission defect may be wider than the two suites named.** CI covers 7 files, the configuration set covers 32 of 33 test files, and 13 configurations have never been executed against `5e10917`. Mitigation: task 0.4 records every suite's result before any fix, and the baseline classifies the rest as unavailable rather than implied green.
7. **Upstream changes again invalidate references.** Fourteen findings were fixed between the two revisions of this baseline, and line numbers moved in 263 files. Mitigation: references are re-read at each revision, task 0.8 records the re-baseline procedure, and task 4.1 forbids comparing results against superseded figures.

## Rollback considerations

- Baseline and documentation tasks are additive and revert by reverting the commit.
- The body-size bound is a single guard; rollback restores the previous decoder.
- Logging is additive; rollback removes the sink without affecting control flow.
- Test-only corrections to the permission suites roll back independently of application code. If the human instead chooses to restore director write authority, that is an application change requiring its own proposal and is explicitly not covered here.
- Grants are idempotent SQL and are reverted by re-applying the previous grant file; no data is dropped.

## Decisions recorded

Recorded with the human on 2026-10-14.

1. **Director authority — resolved: the Director is read-only.** `AcademicAuthorization.php:30` and `routes/academic.php:11` are authoritative; the Director observes and the Vice Principal manages. The existing tests encode the superseded authority and must be corrected to match the implementation. **No application authorization code changes under this decision.** If any later work restores director write authority, that is a separate proposal and is out of scope here.
2. **Browser verification — resolved: repair.** Align the accessible names and headings in `frontend/tests/e2e/academic-foundation.spec.ts`, `frontend/tests/institutional.browser.mjs` and `backend/dev-runtime/verify-tablet-interface.mjs` with what the application renders, remove the fixed Chromium version assertion, and define an executable `test:e2e` script. Retirement task 3.5 does not apply. **Scope note added 2026-10-20:** the decision stands, but the work is larger than selector alignment — the suite asserts a role model the application no longer has, and its director cases perform writes that `routes/academic.php:11` rejects unconditionally. Recorded as tasks 3.4 (re-scope) and 3.8 (director cases, flagged for confirmation).
3. **Authentication grants — resolved: align grants with the code.** Extend `backend/scripts/auth-runtime-grants.sql` with the column-scoped credential and role writes that `LocalAccountService` performs, keeping host `127.0.0.1` and the existing least-privilege pattern. The grants remain subject to review before application; widening them is authorized only to the extent required by the observed write path.

## Decisions still required

No product decision remains open. Five decisions were recorded with the human on 2026-10-14 — the three listed above plus these two:

1. **Body-size limit value (task 2.1) — resolved: 256 KB**, matching the bound already enforced at `SchoolCalendarController:28` (`strlen($raw) > 262144`, exactly 256 × 1024).
2. **Baseline evidence location (task 0.6) — resolved: `docs/verification-baseline-2026-10-14.md`**, which supersedes the conflicting counts in `docs/integral-implementation-plan.md:8` ("19 migrations, 38 tables at baseline") and `docs/project-status-current.md:13,48,65,100,106,141`. Citations carried from the first revision to `docs/project-status-current.md:30` and `docs/local-development.md:39` no longer resolve to counts after the update; the live conflicts are the three listed here.

### Confirmation required before implementation

- **Task 3.8 — rewritten director e2e expectations.** Recorded decision 1 settles which side is correct, but it does not by itself authorize rewriting browser evidence that currently shows director catalog management succeeding. The corrected expectation set must be confirmed by a human before the assertions change. This is the only open confirmation.

### Authorizations this change does not hold

- Installing PHP or Composer, or running `manage-dev.ps1 -Command prepare -Maintenance` — system-level operations.
- Editing `.github/workflows/ci.yml` (task 1.7) — requires specification approval per `AGENTS.md`.
- Commits, pushes or pull requests — the three artifacts are on disk and unversioned.
