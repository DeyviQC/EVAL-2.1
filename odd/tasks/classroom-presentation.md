# Classroom presentation (Pantalla de Aula)
Objective: implement the pending "classroom screen/board presentation" module — a modern, motion-forward full-screen projector view of course materials.
Branch: `feat/classroom-presentation` (created after PR #1 merge; prototyping on the current working base meanwhile) | Delivery: `ask-on-risk` | Checks: typecheck + existing suite (151-test floor) + new component isolated tests.
Driver: `ui-aula-design` skill + `landing-page-design`/`scroll-warp` motion layer; CSS-only motion (no animation library dependency).

## Specs

1. **S1 — User art direction (verbatim intent).** User selected "pantalla de aula + motion, pero que se vea como un ui actual no uno de 10 años". Acceptance: the prototype reads as a 2026 product (generous spacing, modern type scale, suppressed chrome, deliberate motion) while inheriting EVAL institutional tokens from `frontend/src/styles.css` (`--eval-primary:#142D56`, `--eval-accent:#28599B`, `--eval-paper:#F3F6FB`); no new color system.
2. **S2 — Projection journey.** The teacher projects materials/activities of one course week: full-screen clean mode (app chrome hidden), next/previous resource,Esc exits and restores focus, position indicator, light standalone PDF/image context via existing retained-file routes.
3. **S3 — Motion layer (enhancement only).** Scroll-driven reveals + view transitions per `landing-page-design`/`scroll-warp` hard rules: `@supports (animation-timeline: view())` guard, `prefers-reduced-motion` static fallback, transform/opacity only, no scroll-jacking, no layout shift.
4. **S4 — Role boundaries.** Presentation is a presentation mode over existing server authorization; teacher sees only assigned course weeks; no new permissions implied (S5 of reproducible-local-setup discipline applies to safety posture).
5. **S5 — Process.** OpenSpec flow: prototype (this repo's `docs/prototipos/`) → explicit user approval → implementation with tests (frontend 151-test floor green) → verification receipt doc.

## Tasks

- **T1** — S1-S4 — `inline` — **prototype complete (pending user visual approval)** — self-contained navigable mockup at `docs/prototipos/aula-presentation/prototype.html`; verified with repo Playwright (Chrome channel): init renders course 3B week 11 (5 resources), ArrowRight/Left cycles resources with View Transitions, filmstrip chip click navigates, position indicator updates, 0 page errors. Institutional tokens inherited; motion guarded by @supports + prefers-reduced-motion.
- **T2** — S5 — user prototype approval cycle.
- **T3** — S1-S4 — implementation pending prototype approval + PR #1 merge.
- **T4** — S5 — verification (typecheck/suite/manual projection walkthrough).

## Log

- **L1 — User request (verbatim):** "pantalla de aula + motion , pero que se vea como un iu actual no uno de 10 años" (in answer to the UI sprint question; context: "quiero mejorar mi iu frontend", Video reference: Midudev rich-frontend techniques adapted without paid services).
- **L2 — Method:** prototype-first per OpenSpec; single self-contained HTML in docs/prototipos using real course-week data shapes (materials + activities per week); motion per scroll-warp/landing-page-design hard rules; institutional tokens event.
- **L3 — Art direction correction (user, verbatim intent):** user saw v1 dark-cinema and answered "se ve feo quisiera que se vea mas como esto [ARKO reference]" then "me gusta pero adaptalo a nuestro sistema". v2 (prototype.html) keeps the ARKO editorial direction: cream atmosphere, serif display headlines, floating glass pill nav, material as full-bleed paper scene, scroll-snap scenes, View Transitions and staggered reveals with the standard guards. v1 kept as prototype-nocturno-v1.html.
- **L4 — System adaptation (v3):** the prototype is now anchored to the real system: breadcrumb "Mis cursos / Matemática 3°B / Semana 11"; role switch Docente/Estudiante mirroring server-side roles (the teacher-only solucionario scene disappears for students and kickers renumber 05/05); materials with real field semantics (title, filename, bytes, mime badge, author_name, published_at); Esc returns to the course panel; planned integration reuses `MaterialsPanel`'s client (`client.list(course.id, after)`, `materialFileUrl(id,'inline')`), `RecordedTime`, the `message(error)` map for 401/403/409/422 and NO new server endpoints (projection is read-only over the existing `/academic/my-courses/{id}/weeks` GETs, so S4 holds without new grants). Verified: teacher 6 scenes, student 5 + renumber, restore ok, 0 page errors (Playwright chrome).
