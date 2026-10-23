# Browser Back and Forward navigation

The human reports a blank screen when using browser Back for any role. EVAL currently changes sections only in React state, without browser history entries, so Back leaves the application instead of restoring its previous section.

Bind section navigation to the History API for all four roles. Register a home entry on first entry, restore validated section states on popstate, keep refresh/storage behavior, and reject entries belonging to another account/role or an unauthorized section. Navigation never replays writes. URLs carry only the section name; account binding stays in history state. Retain the existing internal return controls and all data permissions. Verify real Back/Forward and reload for all roles without academic writes.

## Follow-up: initial launcher page
The human supplied a screenshot explicitly showing `about:blank` after Back. The first fix covered section history but did not remove the browser launcher's original blank document. The supported local launcher now replaces a pristine initial document instead of navigating with `goto`. Tabs containing existing history are not reused. A shared launcher helper is used by both the visible browser and the four-role acceptance test. Acceptance additionally checks initial history length and Back at the oldest application entry, not only Back between sections.
