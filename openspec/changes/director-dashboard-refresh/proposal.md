# Director read-only dashboard visual refresh

Status: visual direction and bounded frontend scope approved by the user on 2026-10-28. This change does not close or claim completion of project-wide gates.

## Goal

Improve the Director's read-only home by adapting the clear information hierarchy and welcoming visual rhythm of the student dashboard to the Director's consultation tasks.

## Scope

- Present a role-specific institutional overview and the existing four summary indicators.
- Make the four existing Director consultation destinations easy to scan: academic reports, institutional information, institutional history, and the audit log. Keep "Mi perfil" only in the existing navigation menu.
- Preserve the explicit read-only boundary.
- Keep the existing institutional palette and responsive behavior.

## Constraints

- Do not add or fabricate statistics, data, workflows, permissions, or destinations.
- Do not change backend APIs, authorization, other roles, or student behavior.
- Reuse existing Director summary data and navigation if application work is later approved.
- Do not change the existing navigation, other roles, or server-side authorization.
- Use the existing application technologies: React, TypeScript, Vite, and Tailwind CSS. The static HTML/CSS prototype is for visual review only.

## Prototype

See `docs/prototipos/director-dashboard/index.html`. Its indicators intentionally contain no values; it is a visual proposal, not a connected screen.
