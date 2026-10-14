# Develop EVAL as a five-person team

Use one short-lived branch and one pull request per coherent task. Do not wait until every feature is finished to perform one large merge.

## Quick path

Ask the repository owner to add each teammate as a GitHub collaborator. Each person clones their own checkout once:

```powershell
git clone https://github.com/DeyviQC/EVAL-2.1.git
cd EVAL-2.1
```

Then repeat this cycle for every bounded result:

1. Create or assign a GitHub issue.
2. Update local `main` and create a branch from it.
3. Implement the behavior, tests, migration, and documentation together.
4. Open a pull request early and request one teammate's review.
5. Merge one reviewed pull request at a time, then update the other active branches.

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/schedules-week-view
# Work and verify.
git add <reviewed-files>
git commit -m "feat(schedule): add weekly schedule view"
git push -u origin feat/schedules-week-view
```

Use branch names such as:

- `feat/schedules-week-view`
- `feat/attendance-register`
- `fix/attendance-validation`
- `docs/local-setup`

Do not use one permanent branch per person. Branches represent reviewable work, not team members.

## Integration rules

| Rule | Team practice |
| --- | --- |
| Stable integration branch | Keep `main` runnable. Do not develop directly on it. |
| Review | Require at least one teammate to review every pull request. The author does not approve their own work. |
| Merge timing | Integrate continuously after checks and review; never save all merges for the end. |
| Merge method | Prefer **Squash and merge** for a simple, readable `main` history. |
| Branch updates | Use `git fetch origin`, then `git merge origin/main` inside the feature branch. Do not force-push shared branches. |
| Scope | One pull request should have one outcome. Split schedules and attendance unless one cannot work without the other. |
| Tests | Keep tests in the same pull request as the behavior they verify. |
| Database | Coordinate migration filenames before creating them; never edit a migration already merged and used by teammates. |
| Secrets | Never commit local credentials, database files, certificates, browser profiles, or `.env` files. |

Before opening a pull request:

```powershell
git fetch origin
git merge origin/main
npm --prefix frontend run typecheck
npm --prefix frontend test
git status --short
```

Run the backend or browser checks that apply to the changed behavior as well. Record any unavailable check in the pull request instead of claiming it passed.

## First checkout on Windows

Requirements:

- 64-bit Windows
- [Git for Windows](https://git-scm.com/download/win)
- [Node.js 24 or newer](https://nodejs.org/en/download)
- Internet access for the first dependency download
- no administrator account required

Confirm the tools before setup:

```powershell
git --version
node --version
npm --version
```

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-team.ps1 -Command inspect
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-team.ps1 -Command prepare
powershell -ExecutionPolicy Bypass -File .\backend\scripts\setup-team.ps1 -Command verify
.\backend\scripts\manage-dev.ps1 -Command start
```

`prepare` retains verified downloads and removes only a partial runtime that it created if preparation fails. Once setup succeeds, `verify` requires the owned MySQL process to be running; after a reboot, run `manage-dev.ps1 -Command start` first.

Then double-click `Abrir EVAL.cmd`, or open a role explicitly:

```powershell
.\backend\scripts\manage-dev.ps1 -Command open -Role teacher
```

Stop the application workers without deleting local data:

```powershell
.\backend\scripts\manage-dev.ps1 -Command stop
```

The setup command downloads pinned PHP, MySQL, and Composer artifacts, verifies SHA-256 hashes, installs locked dependencies, builds the frontend, initializes an isolated MySQL instance, and provisions synthetic local accounts. It refuses to replace an existing `.local/runtime`.

Double-click `Ver accesos EVAL.cmd` to see the generated passwords for the synthetic local accounts. Never paste those passwords into GitHub, chat, documentation, screenshots, or commits.

The version shown by `setup-team.ps1 -Command inspect` is the team contract. Historical versions in `docs/local-development.md`, such as the earlier MySQL 8.0.46 restoration, describe one previous machine and are not fresh-checkout requirements.

## What belongs in Git

Commit reusable project artifacts:

- application source;
- tests;
- migrations;
- scripts;
- specifications and documentation;
- lockfiles when dependencies intentionally change.

Never commit generated or private state:

- `.local/`
- `backend/vendor/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/.env*`
- certificates, passwords, database data, uploaded materials, or browser profiles.

Confirm the boundary before every commit:

```powershell
git status --short
git status --ignored --short
```

Never use `git add -f` to bypass these ignore rules.

## Schedules and attendance

Create separate OpenSpec changes and GitHub issues before implementing these product areas. Define role permissions, academic scope, data retention, corrections, and reports before creating schemas or UI.

The repository explicitly excludes **QR attendance** from the initial MVP. Ordinary attendance is not automatically authorized by that exclusion or by the existing academic foundation; agree on its exact scope with the team before implementation.

A safe initial split is:

1. schedule requirements and read model;
2. schedule administration and conflict validation;
3. attendance requirements and authorization model;
4. attendance capture and correction history;
5. attendance reports.

Keep each item independently reviewable and integrate it before starting work that depends on it.
