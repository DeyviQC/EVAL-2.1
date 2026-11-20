# Verification

- RED: the focused account verifier failed while a newly created student still received `must_change_password=true`.
- GREEN: `manage-dev.ps1 -Command verify-users -ServerOnly` passed 35 authorization, retention and restricted-privilege checks; student creation and reset keep `must_change_password=false`, while teacher creation and reset retain the existing requirement.
- `npm test`: 303 frontend contract and rendering tests passed.
- `npm run build`: TypeScript application/tooling checks and the Vite production build passed.
- Live HTTPS browser verification authenticated the existing fictitious student Kevin and confirmed `/account` returns `must_change_password=false` with no mandatory password-change screen.
- Independent static verification confirmed the exemption applies only to an exact sole `student` role; malformed multi-role identities do not inherit the exemption and remain rejected by dashboard-role projection.

The voluntary password-change workflow, administrative resets, session revocation and teacher provisioning policy remain unchanged. No remote operation was performed.
