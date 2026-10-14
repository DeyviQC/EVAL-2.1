# Session restoration and recovery
User reports login flashing during reload, disabled login after errors and perceived slow startup.
Restore session facts before rendering credentials: checking/expired/unavailable show neutral progress/recovery; credentials appear only when anonymous is confirmed.
Recover CSRF with one safe GET after confirmed invalid-credential/419 rejection. Never replay login/logout writes. Bound session/profile requests at 10 seconds with explicit connection recovery.
Consolidate own account, authoritative role and navigation into one /account/bootstrap GET, replacing three profile/navigation requests. Initial session restore now uses two requests total.
Remember only the selected section in per-account/per-role sessionStorage; validate it against current role allowlists. No secrets or authorization are stored there.
No schema, account, role, or academic-record changes.
