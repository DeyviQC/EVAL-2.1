# Feature: Complete tablet optimization
Objective: Make every EVAL screen look and feel native on tablets (7–13", 768–1280 px), both portrait and landscape, without breaking mobile or desktop.
Branch: feat/student-panel-completion | Strategy: single-pr continuation | Runner: frontend npm test/typecheck/build; manual tablet preview.

## Specs
- S1 — Sidebar must collapse to icon-only on tablet landscape (done), and bottom nav must work cleanly on tablet portrait.
- S2 — Login/welcome page must use a stacked layout on tablet portrait and a balanced two-column layout on tablet landscape; no overflow or tiny text.
- S3 — Student dashboard cards, stats, courses, tasks, notices and agenda must scale to 2–3 columns on tablet with touch targets ≥ 48 px.
- S4 — Student course catalog grid must use 2 columns on tablet portrait and 3 columns on tablet landscape; tiles must not truncate teacher names.
- S5 — Student task list filters must stay usable without horizontal scroll; cards must show full title and date; drawer must be wide enough on tablet.
- S6 — Forms, inputs, buttons and tables inside workspaces must be readable and tappable on tablet (font-size ≥ 16 px for inputs to prevent zoom).
- S7 — Global typography, spacing and shadows must be comfortable at tablet viewing distance (1.5–2× mobile sizes where needed).
- S8 — No fabricated production data; hide elements when real data is absent.
- S9 — Preserve existing mobile (< 768 px) and desktop (> 1280 px) behavior.

## Tasks
- T1 | S1,S7 | Global tablet breakpoint CSS: typography, touch targets, grid helpers, input font sizes. | inline | done |
- T2 | S2 | Optimize login/welcome page for tablet portrait and landscape. | inline | done |
- T3 | S3,S4,S5 | Optimize student dashboard, course catalog and task list for tablet. | inline | done |
- T4 | S6 | Optimize forms, tables and common workspace components for tablet. | inline | done |
- T5 | S1,S7 | Verify shell header, sidebar, bottom nav and command palette on tablet. | inline | done |

## Verification
- Frontend typecheck: pass
- Frontend tests: 273/273 pass
- Production build: pass
- Manual tablet preview pending after restart

## Log
- L1 (2026-10-21) User requested complete tablet optimization because mobile looks good but tablet still looks bad; needs landscape and portrait fixes across the whole app.
