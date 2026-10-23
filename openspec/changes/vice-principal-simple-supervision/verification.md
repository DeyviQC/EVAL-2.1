# Simple supervision verification

Date: 2026-10-22 (America/Bogota). Existing main baseline a385842.

## Implemented
- Supervision selects academic year, grade, section, then a course from that exact classroom. Reuses the existing authorized academic directory and server-side assignment filters; no unfiltered course-page scan or new backend permission.
- Retrieves all metadata pages, retains scoped course/material pagination, resets dependent choices immediately, rejects cross-classroom/course responses and ignores stale/unmounted results.
- Course selection loads materials automatically. Removed redundant initial consultation buttons. File metadata/versions and module instructions are native disclosures, closed by default. Historical assignments retain their read-only behavior.
- Readable text, visible separate labels, 44px-or-larger controls, focus indicators and wrapping. Material open/download actions remain available. Observations use short labels, a 5000-character textarea bound and explicit workflow state names for supervisors. Existing uncertainty/expected-revision safeguards remain unchanged.
- A vice-principal-only small-screen CSS correction prevents header search/title overlap; shared header source and other roles are unchanged.

## Executed checks
- Test-first help-disclosure case failed against the original always-visible guide. Four additional tests cover exact server-side scope/cursor transport, incomplete-scope rejection before requests, cross-classroom rejection and metadata pagination/repeated-cursor rejection.
- Frontend: 281 tests passed, no failures/skips. Application/tooling typecheck and Vite production build passed.
- Real Chrome regression: **23 checks passed**, including private vice-principal login, dependent selectors, matching filtered requests, one simulated GET failure and explicit recovery, protected file GET, observation-form consultation without submission, closed default disclosures, controls at least 44px, no document overflow or header overlap at 390/768/1280px, light/dark captures, and a deliberately delayed material response ignored after a grade change. Academic writes: **0**.
- Browser script: `backend/dev-runtime/verify-simple-supervision.mjs`; requires running owned EVAL, installed Chrome, EVAL_DEV_ROOT and a JSON object with the vice_principal password via stdin. Passwords are never command arguments or emitted. The test expects the existing demonstration to have at least two courses and two grades.
- Screenshots inspected in private ignored storage: `supervision-simple-{desktop,mobile,dark}.png`. Initial label-name ambiguity and mobile header overlap found during verification were corrected. A test locator was corrected to use the close button's changed accessible name after opening observations.
- EVAL was initially stopped; only its owned local runtime was started for verification. No migrations, demo loading, identity edits, observation writes or remote publication were performed.

## Remaining blocks and limits
This implements the first approved supervision/simplicity block. Actionable home alerts, account-to-enrollment/assignment journeys and controlled identity editing remain future blocks. Observation state labels are per record; no institution-wide pending counters or state filters are invented. No new fixture accounts or academic records were created. No claim of physical-device testing, comprehensive accessibility audit or all-role end-to-end acceptance.
