# Vice Principal Account Directory

Status: Approved for this bounded delivery by the human in this chat on 2026-10-21 (America/Lima), after requesting blue focus and green/red account status. Implementation and local verification completed; see verification.md. Integral architecture and institutional acceptance remain open.

## Problem

The current user directory searches only an exact username. Vice Principal staff need to find students and teachers by name or username and distinguish role and account status. Existing buttons provide inconsistent hover, pressed and selected feedback.

## Proposed bounded delivery

- Extend the existing server-authorized account directory with a trimmed, case-insensitive partial name/username search (maximum 100 characters), role (all/student/teacher), status (all/active/inactive), and existing 50-record cursor pagination.
- Apply all filters on the server before pagination, using bound query parameters and literal matching for wildcard characters. Preserve existing exact-username callers.
- Reset pagination when applied filters change; discard outdated responses. Show loading, empty, error and expired-session states. Provide explicit Search and Clear actions.
- Keep existing creation, password reset, activation and deactivation behavior and confirmations. No identity editing, role changes, deletion or new schema in this unit.
- Improve buttons only inside the Vice Principal user workspace: subtle hover color, stronger transient pressed color, visible keyboard focus, persistent selected-tab styling, loading feedback and disabled behavior. Hover must not imply selection or success. Use existing theme tokens, including dark mode; respect reduced motion.
- Keep students/teachers denied by server policy; retain the existing Director read-only boundary. No global button redesign or unrelated shared-page changes.

## Architecture

Extend LocalAccountService::directory and its typed frontend client instead of adding a second identity store or endpoint. Maintain backward-compatible existing username/after parameters; add search/role/status filters. Do not load all accounts into the browser. Reuse existing account cards and local button styling scoped to UsersWorkspace.

## Review artifact

docs/prototipos/vice-principal-directory/index.html is an isolated English-language interaction prototype with synthetic accounts. It does not access the application or create records. Production interface copy remains Spanish, consistent with the existing application.

## Gates

The human accepted this bounded scope, architecture and adjusted prototype with “Esta bien okey vamos con las demas”. This does not close integral architecture or institutional acceptance gates, or authorize unrelated features. AGENTS.md remains authoritative. No commit, push or remote operation is included in this delivery.
