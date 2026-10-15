# Classroom presentation verification

## Candidate and scope

Branch: `feat/classroom-presentation`, baseline `63e7137`. This change implements the approved editorial direction over existing weekly resources. It does not add role switching, private solutions, grading, or submission views.

Open a course, select a week, and choose **Proyectar semana**. Previous/next navigation displays loaded resources; **Cargar más recursos** explicitly fetches further pages. **Volver al curso** or Escape closes the dialog and restores focus. Browser fullscreen is optional; denial leaves the presentation usable.

PDFs use the existing same-origin retained-file inline URL. The UI CSP adds only `frame-src 'self'`; the file sandbox and existing script restrictions remain unchanged. Office files retain a download fallback. No preview conversion or public sharing URL is introduced.

## Observed checks

| Check | Result |
| --- | --- |
| Baseline `npm test` | 202 passed, 0 failed, 0 skipped. |
| Pre-implementation new test run | Failed with TS2307: new component module absent. |
| Candidate `npm test` after correction | 207 passed, 0 failed, 0 skipped. |
| `npm run build` | Passed, including both TypeScript configurations. |
| `node tests/classroom-presentation.browser.mjs` | Passed using installed Chrome against the built app and synthetic authorized routes. |
| Browser scenarios | Same-origin inline file, activity instructions, bounded navigation, Escape/focus, empty and denied states, pagination, desktop/tablet/mobile layout, reduced motion, external-frame CSP rejection, and session expiry closing presentation. |
| Browser side effects | Zero mutation requests and zero external requests. No live database used. |

## Independent verification

An independent verifier ran the baseline and initial candidate in a fresh scratch copy outside the workspace. It found gaps in token inheritance, guarded motion, expiry coverage, and this verification record. Those findings received one correction batch. A second fresh scratch copy was used for a targeted recheck: all four reported blockers were resolved; `npm test` passed 207/207 with no skips and the browser command passed. The recheck did not repeat build/typecheck or the baseline suite.

The user-owned native review switch is globally off and was left unchanged. The optional assessment refused undeclared untracked paths and therefore supplied no assessable candidate; no native review was started or approval fabricated. Ordinary functional and independent verification above remain the available proof.

## Limits

- The embedded-file browser fixture proves same-origin framing, not PDF-plugin rendering on every school tablet.
- An embedded document receives browser focus; use the visible presentation controls when its viewer consumes arrow keys.
- Real projector legibility, physical tablets, and live user acceptance remain pending.
- Optional browser fullscreen may consume the first Escape to leave fullscreen; Escape again closes the modal.
