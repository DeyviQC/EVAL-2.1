# Verification and delivery — block 3
## Implemented
- One Activities navigation entry; legacy notice destinations route to the same workspace.
- Teacher classroom buttons reuse the shared selection. Authorized activity-course filtering is applied before pagination.
- Compact activity cards lazily fetch details, submissions and the pending roster when opened.
- Per-student expandable work review, protected file downloads, AD/A/B/C assessment and required feedback use existing writers.
- Student confirmation follows a validated submission receipt. Uncertain writes retain consultation and explicit-review requirements.
- Current and publication-time eligible students without a delivery are projected from retained enrollment data; student access is denied.
- Existing weekly-calendar activity detail uses the same review component with the correct role context. Automatic scheduling is deferred.
## Files
Frontend: ActivityWorkspace.tsx, IntegratedActivityWorkspace.tsx, activities.ts, SessionShell.tsx, NotificationWorkspace.tsx, WeeksPanel.tsx, MyCourses.tsx, styles.css.
Tests: integrated-activities.test.tsx, contracts.runner.mjs; backend/dev-runtime/verify-integrated-activities.mjs.
Backend: ActivityDelivery.php and ActivityDeliveryController.php.
## Verification
183 frontend contract/render tests passed. TypeScript and production build passed.
31 authenticated HTTPS/MySQL checks passed, covering classroom filtering, pending rosters, role rejection, publication, TXT upload, protected download, teacher assessment, student result, denial of student grading, denial of updates after assessment and explicit closure.
6 additional read-only checks confirmed delivery and grade notifications in the correct account feeds.
PHP syntax and Git whitespace checks passed.
The local integration run created activity 21 with a verification title, one TXT delivery and grade A, then closed it. It remains in retained demo history; no user records were reset.
The tracked integration harness requires a running local demo instance and private credentials JSON over stdin; do not pass secrets in command arguments or chat.
## Database
No migration, schema change or duplicate grade storage.
## Remaining
Visual browser acceptance was not performed in this block. Refresh the existing working EVAL browser window for user review.
Activity editing/deletion and automatic calendar synchronization require the next block approval. Three-trimester dates remain unresolved.
