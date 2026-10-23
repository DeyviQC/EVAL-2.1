# Verification — 2026-10-23

## Results
- `npm.cmd --prefix frontend test`: 296 passing contract/UI tests, including closed-task visibility and read-only graded delivery access.
- `npm.cmd --prefix frontend run build`: both TypeScript configurations and Vite build passed.
- PHP unit suite: 67 tests, 130 assertions passed. `DeliveryAssessment.php` syntax check passed.
- Browser role acceptance: 50 checks passed; zero JavaScript page errors; one intercepted successful submission; zero real domain writes.
- Existing vice-principal workflow regression: 36 checks passed; one intercepted success; six denied authorization probes; zero real academic mutations or page errors.
- JavaScript/PowerShell syntax checks and `git diff --check` passed.

## Reproduce browser acceptance
Start the local application normally, then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/scripts/manage-dev.ps1 -Command verify-role-workflows
```

The managed wrapper passes the original local role credentials privately through stdin. The verification script reads assigned tasks, courses, materials and directory records from the running application. It cancels publication, closure, grading, maintenance, password and weekly creation confirmations. Every domain POST is intercepted by Playwright, including the single successful submission used to verify the success notice. Authentication creates ordinary local test sessions.

The original student account has already graded its assignments. One task is therefore presented as pending through intercepted GET fixtures for the submission UI checks. Another real graded task verifies read-only access. No enrollment, task, grade, account or file is created, changed or deleted in the database by this acceptance script.

## Covered behavior
- Empty evidence is rejected before confirmation; cancel preserves a typed response.
- Student task actions open the existing persistent-service activity interface; graded work has no submission form.
- Password confirmation can be canceled without changing credentials.
- Teacher publication rejects past deadlines and asks for confirmation.
- Assessment, material editing/withdrawal/file replacement, activity closure and weekly publication ask for confirmation and cancel without a POST.
- Nested confirmation closes independently of its parent activity dialog.
- Success feedback is visible in the browser top layer.
- Responsive layouts fit 390, 768 and 1440 pixels.
- Dark theme button, filter and directory-cell contrast is at least 4.5:1 on the sampled controls. Light/dark screenshots were inspected locally.
- Direction groups sections by grade and exposes no creation/editing/deactivation controls or account mutation form.
- Delivery reads now succeed on the existing local installation without the optional bimester closure table. No schema migration or closure modification was performed.

This is local acceptance, not deployment or a full production/load certification. Remote branches were not updated by this change.
