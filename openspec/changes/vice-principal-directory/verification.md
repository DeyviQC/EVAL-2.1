# Local Verification and Handoff

Date: 2026-10-21 (America/Lima).
Baseline: 5e10917, branch codex/modulo-subdirector.

## Approval

The human approved the bounded directory requirements, architecture and interaction prototype in this chat after requesting blue focus outlines and green/red account statuses. Approval does not cover identity editing, import redesign, unrelated dashboards or global architecture gates.

## Result

The existing /users directory accepts partial name/username search and role/status filters before 50-row cursor pagination. Exact username callers retain their existing arguments. Filters are parameterized and LIKE wildcard characters are escaped. Existing service authorization remains in place. The account screen distinguishes draft and applied filters, resets pagination on a new search, invalidates stale responses on replacement or unmount, and provides loading, empty, error and retry states.

Visual feedback is scoped to the Users workspace: blue keyboard focus, hover and pressed colors, persistent selected tabs, disabled buttons, reduced motion and green/red account states in light/dark themes. Creation, credential maintenance and enrollment/assignment boundaries remain unchanged.

## Executed checks

- RED: frontend compilation rejected the new third directory argument before implementation; server verification rejected unsupported search filters.
- Frontend contract suite: 224 passed, 0 failed.
- Frontend typecheck and production build passed.
- Server directory verification: 18 checks covering 54 temporary identities, combined filters, 50+3 pagination, partial name/username, literal wildcards, empty results, invalid input, teacher/student denials, preserved Director reads and response field bounds. Fixtures are transactionally rolled back. Auto-increment sequences may advance; no account rows or lifecycle events are retained.
- Browser: 17 checks passed using the actual HTTPS runtime and synthetic development account. Includes combined search, empty results, clearing filters, blue focus, green/red select states, distinct hover/pressed colors, loading/disabled controls, simulated read error and recovery, dark mode and 390px layout without horizontal overflow. No account mutations were made by the browser check.
- Git whitespace check passed. No migrations, dependency version changes, commits, pushes or remote repository operations.

## Reproduction

Frontend: npm --prefix frontend test; npm --prefix frontend run build.

Server: powershell -NoProfile -ExecutionPolicy Bypass -File backend/dev-runtime/run-dev-php.ps1 -ScriptPath backend/dev-runtime/verify-account-directory.php.

Browser: backend/dev-runtime/verify-account-directory.mjs requires EVAL_DEV_ROOT, the pinned owned HTTPS certificate, an installed supported browser and the Vice Principal development password supplied as a JSON password field on standard input. Do not put passwords in command arguments or tracked files. Local screenshots are ignored under .local/eval-dev/vice-principal-directory-{desktop,mobile}.png.

## Remaining gates

No load test, school LAN/WLAN acceptance, institutional data validation or comprehensive accessibility audit was performed. Existing user creation/reset/deactivation journeys were not re-executed because this unit only changes directory reads and visual feedback. The sequential handoff requires a separately authorized finished reconciliation commit before another contributor starts from an exact predecessor; no such commit was created here. Unrelated DOCUMENTACION.md is excluded.
