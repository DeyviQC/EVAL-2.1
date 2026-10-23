# Shared interactions, retained role boundaries

`ActionFeedbackProvider` is mounted once around the authenticated workspace. Its optional scope binds a pending confirmation to the account, profile and selected module. Escape, browser history navigation and scope changes resolve a pending prompt as cancellation. Confirming an action does not bypass any server authorization or stale-revision checks.

Every modified form captures its values before awaiting confirmation. Components retain their write guards and uncertain-result handling. Success feedback follows a decoded server acknowledgement; refresh failures do not trigger automatic retries. Native dialogs handle focus and nested activity details. Success notices use the browser top layer so that an open activity dialog cannot obscure them.

Student task previews open the existing `ActivityCard`, rather than introducing another submission or grading implementation. Graded and closed tasks remain readable. Course and activity search targets use the same detail component. Directory consultation follows category → grade → sections, including inactive catalog entries, without exposing writer controls to Direction.

`role-workflows.css` owns cross-profile confirmations, status notices, consultation cards and theme fixes. Existing course, grade and section selection components remain reusable. Teacher and student content still comes from authorized persistent services.

## Read compatibility correction

Acceptance exposed a server error in `DeliveryAssessment::projection`: an installation without `bimester_grade_closures` could resolve a calendar week and then query the absent table. Projection now follows the existing command compatibility rule and treats the missing optional table as having no stored closures. Installed closure records continue to enforce the original lock restrictions. Calendar date fallback uses the actual `start_on` / `end_on` schema fields.

This change creates no tables, changes no grants and does not reopen or delete any closure, assessment or submission.
