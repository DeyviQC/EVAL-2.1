# EVAL

EVAL is an institutional hybrid educational web platform for I.E. Nuestra Señora de las Mercedes. Its essential student functions are intended to remain available over the school's LAN/WLAN without external Internet, provided the local server, network, and power remain available.

## Planned technology

- Windows Server
- PHP with Laravel
- MySQL
- React with TypeScript
- Tailwind CSS
- IIS or Apache (decision pending)

The development checkout now contains PHP/Laravel, MySQL, React/TypeScript and Tailwind implementation. Windows Server deployment and IIS versus Apache remain planned and unverified.

## Repository layout

Start with the [documentation index](docs/README.md): team setup, current plans, guides, requirements, and historical evidence.

| Path | Purpose |
| --- | --- |
| `.github/workflows/` | Reserved for future automation after tooling is defined. |
| `docs/requisitos/` | Requirements documentation. |
| `docs/arquitectura/` | Architecture documentation and decisions. |
| `docs/prototipos/` | Prototype artifacts; approval status is recorded per feature. |
| `docs/guias/` | Feature walkthroughs and demonstration guides. |
| `docs/pruebas/` | Test strategy and evidence. |
| `frontend/` | React/TypeScript application, typed clients and UI tests. |
| `backend/` | Laravel academic services, local HTTP runtime, migrations and tests. |
| `database/` | Future database assets. |
| `openspec/` | OpenSpec specifications and change artifacts. |

## First-time team setup

On 64-bit Windows with Git and Node.js 24 or newer, prepare a fresh checkout without installing PHP, Composer, or MySQL globally:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-team.ps1 -Command inspect
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-team.ps1 -Command prepare
.\backend\scripts\manage-dev.ps1 -Command start
```

Generated dependencies, credentials, certificates, browser profiles, and database files stay under ignored paths and must not be committed. See [team development](docs/team-development.md) for the five-person branch/pull-request workflow and [local development](docs/local-development.md) for runtime commands.

## Current status

The repository has a real isolated development application with local authentication and four server-authorized dashboards. Director is strictly read-only; Vice Principal manages periods, catalog, enrollments, assignments and accounts. Teacher/student access remains assignment/enrollment scoped. Course materials and activities/deliveries retain versions and private evidence files. It is not a complete institutional MVP. The human-approved integral implementation inventory and remaining phases are recorded in [the implementation plan](docs/integral-implementation-plan.md).

Double-click `Abrir EVAL.cmd` in the repository root. Teacher, student and Vice Principal launchers open separate role sessions. The app uses persistent `eval_dev` data at `https://127.0.0.1:8443`, not a prototype or a PHPUnit preview. See [local development](docs/local-development.md) for commands, credentials access, verified behavior and storage limitations.

Original-teacher AD/A/B/C assessment, required feedback, retained corrections and locked assessed deliveries now work locally. Students consult their own results in My grades. See `docs/pruebas/historico/delivery-assessment-verification.md` for executed database/browser checks and remaining acceptance.

Director classroom reports now show complete delivery/grade totals and a bounded historical roster using real data. See docs/pruebas/historico/classroom-report-verification.md.

Academic notifications now persist activity publication, delivery/update and grading/correction events for their actual recipients. The own feed supports unread counts, explicit refresh, 50-row paging, section shortcuts and bounded read receipts. See docs/pruebas/historico/academic-notification-verification.md.

Pending work includes wider administrator/role management and institutional import, file replacement/purge and supervision, report export, library/search, synchronization, backup/restore and school-network/load acceptance. Current test evidence and remaining gates are recorded in OpenSpec tasks and `docs/local-development.md`; see `docs/pruebas/historico/activity-delivery-verification.md` for the activity/delivery journey.

## Scope boundaries

- EVAL does not replace SIAGIE.
- QR attendance is outside the initial MVP.

Course-scoped Biblioteca now searches eligible real materials by title, description and filename. See docs/pruebas/historico/material-library-verification.md for executed MySQL/browser evidence.
