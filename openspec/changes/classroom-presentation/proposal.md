# Classroom presentation

## Outcome and approved direction

Add a read-only presentation mode to an existing course week. The user approved the editorial prototype direction and authorized development, then selected integrated PDFs with same-origin-only frames.

## Scope

- Open from the weekly course screen, preserving the selected course and week.
- Display server-returned material metadata, inline PDF/JPEG/PNG, and activity instructions.
- Provide previous/next navigation, visible position, optional browser fullscreen, Escape/close, and focus restoration.
- Keep editorial cream/serif styling, institutional blue accents, and reduced-motion support.
- Represent loading, empty, error, and paginated content without fabricating data.

## Boundaries

No role switching, additional permissions, private solutions, grading, submissions, or feedback are introduced. No data is written by presentation mode. Unsupported file types retain their download action rather than masquerading as viewable documents.

## Design

Mount an isolated native modal dialog through a React portal. Read existing `WeeksClient.content` GETs using the selected week and existing scope validation. Fetch material/activity pages together; request later pages explicitly. Clear displayed resources after a failed refresh. Retain existing authorization on file endpoints.

Set `frame-src 'self'` on the development UI's existing CSP. Preserve all other directives, including `default-src 'none'`, `frame-ancestors 'none'`, and the file controller's sandbox. Do not permit external frames or relax script policy.

## Acceptance scenarios

1. Given an authorized week, opening presentation MUST show only returned resources and MUST NOT make mutation requests.
2. Given a PDF, the viewer MUST use the retained-file inline URL on the same origin; external frames MUST remain blocked.
3. Given keyboard navigation, previous/next MUST respect resource bounds; Escape/close MUST return focus to the opener.
4. Given unavailable/empty content, presentation MUST show an explicit state and permit exit; session expiry MUST use the existing expiry handler.
5. Given reduced motion, resource content MUST remain visible and navigation MUST work without animated transitions.

## Verification and rollback

Baseline: `63e7137`, 202 frontend contract tests passing. Run new RED tests before implementation, then typecheck, contracts, build, and targeted browser probes. Independently verify the CSP and shared-screen change. Reverting this unit restores the prior screen/CSP; no database rollback is needed.
