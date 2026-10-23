# Consistent role workflows

## Approved scope
The human requests the confirmed vice-principal interaction pattern for the other profiles: clear actions, confirmation before persistent changes, visible success feedback, institutional color accents and readable themes. Existing teacher assignment and student enrollment boundaries remain authoritative. Direction remains read-only.

## Implementation
- Reuse the shared confirmation and feedback provider across authenticated profiles; cancel pending confirmation when the account or workspace changes.
- Confirm activity publication/closure, evidence submission, assessment, material maintenance, weekly organization, notifications and password changes after local validation and before any write.
- Connect the student task action to the existing reusable activity/delivery interface, including read-only graded deliveries.
- Group institutional consultation by category and grade without adding director mutation controls.
- Preserve uncertain-result guards; never retry writes automatically or report unconfirmed outcomes as success.

## Verification
Run the supported contract suite, TypeScript checks and production build. Exercise role workflows with intercepted writes or cancellation, never by adding demonstration records. Verify read-only direction, invalid fields, canceled confirmations, visible feedback and light/dark responsive layouts.
