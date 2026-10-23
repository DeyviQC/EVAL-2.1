# Catalog and theme verification

Date: 2026-10-22 (America/Bogota).

## Delivered
The catalog now has three category buttons and a compact list. Creation is opened explicitly; only one row editor is shown at a time. State changes require confirmation with a Cancel action. Switching categories clears old rows immediately; clicking the already active category preserves the list. Existing API commands, pagination, grade/section identity rules and uncertain-write blocking remain in use. Confirmed writes followed by a failed refresh have a truthful notice rather than claiming that records refreshed.

Vice-principal labels, legends, fields, placeholders, options, alerts, common fixed utility colors and legacy ink tokens now use theme-aware colors. Dark help and header labels have explicit readable colors. Catalog rows use one surface rather than nested permanently expanded panels. UI changes remain scoped to vice-principal content; no schema or authorization change.

## Executed
- Frontend: 283 tests passed, no failures or skips. Includes two catalog presentation regressions for collapsed editors and uncertainty blocking/recovery. Application/tooling typecheck and production build passed.
- Read-only Chrome script `backend/dev-runtime/verify-catalog-readability.mjs`: 21 checks, three categories, active-category repeat click, opening/canceling creation and editing, canceling deactivation, required section grade, real theme toggle both ways, responsive layout and 44px buttons at 390/768/1440px.
- Measured enabled catalog headings, labels, fields and buttons: minimum contrast 4.9188:1 dark and 7.1753:1 light, above the retained 4.5:1 assertion. The reader handles browser `color(srgb ...)` serialization used by CSS color-mix; initial measurement errors were corrected rather than lowering the threshold. Finite theme transitions settle before measurement.
- Screenshots inspected: private `catalog-simple-light.png`, `catalog-simple-dark.png`, `catalog-simple-mobile-dark.png` under ignored local storage.
- Academic writes during browser acceptance: 0. Forms were canceled, not submitted. No new fixture accounts, migrations or destructive operations.

## Reproduction and limits
The browser script needs running owned EVAL, installed Chrome, EVAL_DEV_ROOT and a JSON vice_principal password on stdin via the existing private local wrapper. Never expose passwords in command arguments. It expects populated demonstration catalog categories. No persistent create/rename/state mutation was repeated in the visual check; existing transport/uncertainty tests remain. Contrast measurements cover the catalog controls sampled, not a comprehensive accessibility audit of every module, gradients or exports. No commit/push or remote publication performed; earlier local supervision work was retained.

## Grade-first follow-up verification
- 284 frontend tests passed, including isolation of sections by grade, inactive records, an absent grade, and records beyond the first 50 entries in the presentation selector.
- Typecheck and production build passed.
- Read-only browser acceptance: 25 checks, including switching grade, complete classroom labels, closing an unsaved editor on grade change, binding the create form to the selected grade, both themes, and three viewport widths. Zero academic writes.
- Section pages are collected before filtering; stale generations and non-advancing cursors are rejected. New section creation refreshes the complete section catalog rather than a slice after the new record ID.
- Inspected private screenshot `catalog-sections-by-grade-light.png`; dark capture also generated. Existing contrast assertions passed (minimum dark 4.9188:1, light 7.1753:1).
- No database reset, schema, role permissions, commit or push changes.

## Progressive navigation verification
- 284 frontend tests passed; typecheck and production build passed.
- Updated browser acceptance: 27 checks passed, including the category menu, grade selection before section display, classroom detail, cancel/back paths, grade-bound creation, light/dark themes, and 390/768/1440px layouts. Academic writes: zero.
- Contrast assertions remain above 4.5:1. Captured and visually inspected `catalog-menu.png` and `catalog-sections-by-grade-light.png` under private ignored local storage.
- Removed kind-based remounting so choosing a different category preserves the explicit navigation level. Switching category/back clears local unsaved forms. Error/uncertainty recovery remains accessible on deeper screens.
- This block changes the catalog only; other subdirector modules retain their existing navigation. No schema, authorization, reset, commit or push operations.
