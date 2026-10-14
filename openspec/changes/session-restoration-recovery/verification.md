# Verification
192 frontend contract/render tests passed, including neutral restoration, confirmed anonymous credentials, invalid-password CSRF recovery, blocked-connection recovery, request timeout releasing busy state, no automatic write replay and a single consolidated profile bootstrap.
TypeScript and production build passed.
9 real browser checks passed: wrong password followed by successful login; 800ms delayed session read with no login form flash; restoring the selected institutional-information view on reload; exactly /auth/session + /account/bootstrap during startup; network failure during login followed by explicit recovery.
Measured warm authenticated reload to restored section: 979ms on the local verification run, not a performance guarantee.
No academic writes. Current four-account database remains clean.
Files: session.ts, InstitutionalShell.tsx, SessionShell.tsx, accounts.ts, navigation.ts, styles.css, LocalAccountController.php; ui.test.tsx, session-recovery.test.tsx, contracts.runner.mjs, verify-session-recovery.mjs.
