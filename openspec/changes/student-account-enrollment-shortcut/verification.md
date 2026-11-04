# Verification

- `npm test`: 300 passed, including rendering the shortcut destination with the new student selected before the directory loads and the existing enrollment prerequisites disabled.
- `npm run build`: passed, including both TypeScript configurations.
- No real account or enrollment was created for verification. The complete interactive creation journey and generated-credential handling were not browser-tested.
- This change adds only vice-principal navigation and feedback over existing account/enrollment commands. No backend schema or authorization changes, remote operations or commits were performed.
