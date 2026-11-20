# Guided Director consultation

Status: proposed; human prototype acceptance pending.

## Problem and requirements

The current home exposes destinations but gives little help choosing a consultation. Preserve the four destinations, existing summary fields, profile navigation, and read-only authority.

## Proposed changes

- Replace generic hero copy with a concrete classroom consultation entry point.
- Explain each destination through the question it answers.
- Add a three-step orientation: choose a consultation, use its available filters, inspect the result.
- Add an expandable profile-location hint.
- Keep guidance responsive, keyboard accessible, and independent of external resources.

## Architecture

After acceptance, reuse the existing React/TypeScript components, scoped CSS, summary client, and navigation. No new dependencies, API contracts, metrics, or permissions are proposed. Prototype: `docs/prototipos/director-dashboard-guided/index.html`.

## Change record

2026-11-04: created a separate HTML/CSS proposal preserving the prior prototype and application. New copy explains existing behavior; the static cards do not navigate to application modules. Placeholder indicators remain placeholders. Prototype rendering and authenticated application behavior have not been verified in this iteration.

## Acceptance and remaining work

- [x] Review the existing Director home and approved scope.
- [x] Create a separate guided consultation prototype.
- [x] Document every proposed change and architecture boundary.
- [ ] Review desktop/mobile rendering and keyboard navigation.
- [ ] Obtain human approval of the revised prototype and bounded requirements/architecture.
- [ ] Implement the accepted design in the application.
- [ ] Run frontend tests/build and verify real navigation, loading/error states, and mobile layout.
- [ ] Record final implementation evidence and team handoff.

Project-wide gates remain unchanged. This proposal does not authorize remote publication.
