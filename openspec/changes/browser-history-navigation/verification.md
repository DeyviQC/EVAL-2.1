# Browser history verification

Date: 2026-10-23 (America/Bogota).

## Implemented
Section changes now create same-origin History API entries. Back/Forward restore the section without reloading or replaying operations. First entry registers a home return point; refresh reuses existing entries. Restored entries must match the active account, role and allowed section list; foreign/invalid entries return to the current profile's home. Session storage is synchronized on restore. Course/activity targets are cleared when changing history sections to avoid reopening stale detail targets. History setup runs before the interactive profile navigation is painted and its listener is removed on session/identity change.

## Verification
- 291 frontend tests passed. New cases cover all role menus, Back/Forward, refresh without duplicate entries, repeated clicks, rejected foreign/unauthorized states and listener disposal.
- Typecheck and production build passed.
- Read-only Chrome acceptance covers the four original roles: two section visits, Back, Forward, reload retaining the selected section without growing history, Back after reload, and return home. Browser exceptions and academic writes are asserted zero.
- No database or role changes. No new remote push performed for this fix.

## Limits
The new browser-history entries track top-level EVAL sections. Existing within-module return controls keep their own detailed state; a task card, classroom filter or editor does not introduce another browser-history entry. Returning beyond the initial home entry can leave the site, consistent with browser navigation. Browser acceptance checks session-authenticated section navigation, not navigation away to external sites or operating-system browser controls.

## Initial-page follow-up result
The shared launcher helper was exercised with all four roles: 46 browser assertions passed, including initial history length one and repeated Back at the oldest application entry. No browser exceptions or academic writes. The visible Subdirection window was reopened using the corrected launcher. The local build and frontend tests remain verified in the subsequent workflow block.
