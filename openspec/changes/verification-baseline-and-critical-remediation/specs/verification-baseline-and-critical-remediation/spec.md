# Verification Baseline And Critical Remediation

Requirements for establishing an executable baseline and remediating the correctness hazards identified by static review of the checkout. No requirement here authorizes product-policy change. Decisions 1-5 recorded in the proposal are binding for this change: the Director is read-only, the browser verification is repaired rather than retired, the versioned authentication grants are aligned to the account write path, the body-size bound is 256 KB, and baseline evidence lives in `docs/verification-baseline-2026-10-14.md`.

The baseline is a living record with explicit revisions. Revision 1 was recorded 2026-10-14 at `a29ecfe`; Revision 2 was recorded 2026-10-20 at `5e10917` after a repository update. Requirements below apply at the revision named by the baseline, and references MUST be re-read at each revision rather than carried forward.

## ADDED Requirements

### Requirement: Executable verification baseline

EVAL MUST provide a recorded baseline stating the result of every supported check before any remediation is applied.

#### Scenario: All suites are executed
- GIVEN the backend and frontend dependencies are restored
- WHEN every PHPUnit configuration and the frontend suites are executed
- THEN each configuration appears in the baseline with its pass, fail and assertion counts, and a failing suite is recorded as failing rather than omitted.

#### Scenario: A check cannot be executed
- GIVEN a supported check cannot run because its runtime, dependency or data is unavailable
- WHEN the baseline is written
- THEN the check MUST be reported as unavailable with its reason, and MUST NOT be recorded as passing.

#### Scenario: The checkout changes after a baseline exists
- GIVEN a baseline was recorded at an earlier revision
- WHEN the repository advances
- THEN every prior finding is re-classified as resolved upstream, partially resolved, or still open with evidence read at the new revision, and prior figures are marked superseded rather than silently reused.

### Requirement: Status counts have one source

The counts of tables, migrations and tests MUST be stated in exactly one document, which other documents reference instead of restating.

#### Scenario: Conflicting counts are found
- GIVEN two documents state different values for the same metric
- WHEN the baseline is recorded
- THEN one value is designated authoritative, the others reference it, and no document retains a divergent number.

#### Scenario: A cited artifact does not exist
- GIVEN a document states a count by naming a range of files
- WHEN the baseline verifies the claim
- THEN every named file is confirmed to exist, and a citation to a non-existent artifact is reported as a defect rather than corrected silently.

### Requirement: Permission contract is consistent with its tests

`AcademicAuthorization` and the PHPUnit suites that exercise it MUST agree on which role holds each authority.

#### Scenario: Authority is decided
- GIVEN the recorded decision is that `director_admin` is read-only and `vice_principal` holds catalog and period authority
- WHEN the suites are aligned to that decision
- THEN `./backend/scripts/local.ps1 -Command test -Unit U9 --testdox` reports zero failures.

#### Scenario: Implementation must not drift from the decision
- GIVEN the implementation at `AcademicAuthorization.php:30` already matches the recorded decision
- WHEN the tests are corrected
- THEN no application authorization file changes, and restoring director write authority later MUST be proposed separately rather than smuggled in through this change.

### Requirement: Director mutations are rejected before dispatch

A non-GET request from a `director_admin` actor MUST be rejected before any controller executes.

#### Scenario: Regression protection
- GIVEN the rejection at `routes/academic.php:11` is removed
- WHEN the regression test for this requirement is executed
- THEN the test MUST fail, proving the assertion is load-bearing rather than tautological.

### Requirement: CI executes the permission contract

The permission contract MUST be executed by an automated pipeline, not only by suites that run on demand.

#### Scenario: CI selection covers the authority suites
- GIVEN `ci.yml` runs `phpunit -c phpunit.xml --testsuite Unit`
- WHEN the selection is reviewed
- THEN `AcademicAuthorizationTest` and `AcademicPolicyHttpTest` are executed by that job.

#### Scenario: A green pipeline must mean something
- GIVEN every suite that asserts role authority is executed automatically
- WHEN the permission contract changes
- THEN a regression in that contract produces a failing pipeline rather than a passing one.

#### Scenario: Workflow modification is gated
- GIVEN `.github/workflows/ci.yml` is an existing workflow
- WHEN this requirement is implemented
- THEN the modification is approved as a specification before any edit is made, and no workflow is created by this change.

### Requirement: Automated UI verification encodes the recorded authority model

The browser verification MUST assert the authority model recorded as decision 1, not a superseded one.

#### Scenario: Director cases assert observation, not mutation
- GIVEN `routes/academic.php:11` rejects every non-GET request from a `director_admin`
- WHEN the director cases in `academic-foundation.spec.ts` are executed
- THEN no case expects a director mutation to succeed, and each expects the write to be rejected and the read to be served.

#### Scenario: Role menus match the application
- GIVEN `role-dashboards.tsx` assigns the Director `reports, institution, history, audit, account` and the Vice Principal twelve sections
- WHEN the suite asserts the navigation a role exposes
- THEN the asserted lists are produced from the current `roleMenus` rather than from a remembered model.

#### Scenario: The correction is confirmed before it is applied
- GIVEN the correction changes what the suite proves about director catalog management
- WHEN implementation is proposed
- THEN a human confirms the rewritten expectation set before the assertions are changed.

### Requirement: Request bodies are bounded

Every JSON request endpoint MUST reject a body larger than the approved bound instead of decoding it without limit.

#### Scenario: Oversized body
- GIVEN a JSON endpoint that today decodes an unbounded body
- WHEN a request larger than the approved bound is submitted
- THEN the endpoint responds with a 413-class rejection and MUST NOT return 500 or terminate from memory exhaustion.

#### Scenario: Existing payloads still work
- GIVEN the bound proposed matches the limit already enforced by `SchoolCalendarController`
- WHEN payloads within the bound are submitted
- THEN behavior is unchanged for every existing request.

### Requirement: Failure responses are traceable

A failure response that carries a `correlation_id` MUST have the same id persisted locally with enough context to investigate it.

#### Scenario: Incident can be reconstructed
- GIVEN a request fails with a 503-class response carrying a `correlation_id`
- WHEN the failure is investigated
- THEN the same `correlation_id` is found in the local log together with the failure category, method and path.

#### Scenario: Log contains no sensitive material
- GIVEN a failure originates from a database exception
- WHEN the log entry is written
- THEN it MUST NOT contain SQL statements, bindings, passwords or stack traces.

### Requirement: Domain tests belong to a suite

Every PHPUnit test file under `backend/tests/` MUST belong to at least one configuration file, and this MUST hold as a check rather than as a one-off correction.

#### Scenario: Test reachability holds
- GIVEN `backend/tests/` contains 33 test files and the configurations reference 32
- WHEN the reachability check runs
- THEN the two sets are reported as equal after the missing file is added, and any future commit that reintroduces an orphan fails the check.

#### Scenario: The historical orphan is recorded, not forgotten
- GIVEN `DeliveryTimingTest.php` was orphaned at revision 1 and was added to `phpunit.xml` upstream
- WHEN the invariant is established
- THEN the fix is not treated as proof that the invariant already holds, because a different file — `backend/tests/Feature/Academic/IdentityRetentionTest.php` — became the sole orphan.

#### Scenario: A named configuration file must exist
- GIVEN a configuration lists a file path
- WHEN the reachability check runs
- THEN a listed path that does not resolve on disk is reported as a defect.

### Requirement: Versioned grants support the code paths they back

The authentication runtime grants MUST cover every table and column written by the account administration path, restricted to host `127.0.0.1` and to the specific columns that path writes. The recorded disposition is to align the grants with the code.

#### Scenario: Account path executed against versioned grants
- GIVEN a database provisioned only from `auth-runtime-grants.sql`
- WHEN account creation and password reset are executed
- THEN both operations succeed.

#### Scenario: No privilege broadening beyond the observed writes
- GIVEN the grants are extended
- WHEN the file is reviewed
- THEN it contains no `ALL PRIVILEGES`, no `GRANT OPTION`, no `DELETE`, no DDL, and no host other than `127.0.0.1`.

### Requirement: Browser verification matches the application

Automated UI verification MUST target accessible names and headings that the application actually renders, and an e2e script MUST be executable. The recorded disposition is repair.

#### Scenario: Selectors match rendered UI
- GIVEN the application renders its labels, headings and navigation from `SessionShell.tsx` and `role-dashboards.tsx`
- WHEN the suites are executed against a running instance
- THEN no assertion targets an accessible name or heading that `frontend/src/` does not produce, and each corrected expectation cites the source line that produces it.

#### Scenario: References are current
- GIVEN task references were written against an earlier revision
- WHEN they are used for implementation
- THEN each line reference is re-read against the current revision, and a reference that no longer resolves — such as `SessionShell.tsx:78`, which no longer renders a credential label — is corrected before the task is worked.

#### Scenario: e2e is executable
- GIVEN `frontend/package.json` defines only `test:e2e:list` today
- WHEN the change is applied
- THEN `npm run test:e2e` invokes Playwright, exits with a real pass or fail status, and no assertion depends on a fixed browser version.

### Requirement: Verification reports deltas against the baseline

After remediation, results MUST be compared against the Phase 0 baseline, and any unexplained difference MUST be reported.

#### Scenario: Unexplained regression
- GIVEN a suite passed at baseline and fails after remediation
- WHEN the final verification runs
- THEN the regression is reported explicitly and is not attributed to a task that did not cover it.
