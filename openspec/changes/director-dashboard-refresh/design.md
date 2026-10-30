# Design: Director read-only dashboard refresh

Status: visual direction and bounded frontend architecture approved by the user on 2026-10-28. Project-wide gates remain unchanged.

## Application technology

If implementation is later authorized, make the Director-only presentation change within the existing React and TypeScript frontend built with Vite and Tailwind CSS. Reuse the current design tokens, components, summary client, and role navigation. Do not introduce a separate application, framework, or dependency for this visual change. The standalone HTML/CSS artifact is only a review prototype.

## Composition

Use the student dashboard's sequence of greeting/context, prominent hero, summary indicators, and task-oriented follow-up. Adapt the content to the Director's existing read-only role:

1. A page heading with the EVAL identity and an always-visible "Solo lectura" badge.
2. A navy/royal institutional hero with concise context and a link to consultation destinations.
3. Four responsive summary cards using only the existing overview fields: students, classrooms, activities, and graded deliveries.
4. A consultation grid containing exactly the existing Director destinations.
5. A separate read-only boundary card explaining the scope of the panel.

The home grid contains the four consultation destinations. "Mi perfil" remains available only through the existing role navigation.

Retain the approved institutional palette: navy `#142D56`, royal `#28599B`, white, gold `#D4AF37`, and canvas `#F3F6FB`. Use the same structure at narrow widths by collapsing grids; do not hide the read-only label or remove keyboard focus.

## Data and navigation

The static prototype uses dashes instead of example values. If application implementation is approved, render the existing server-provided summary and existing role menu; preserve their loading/error behavior and do not introduce new queries or client-side permissions.

## Non-goals

No new metrics, charts, activity feed, management actions, profile mutations, API changes, role changes, or student-dashboard changes.

This bounded UI change does not close or claim completion of project-wide planning gates.
