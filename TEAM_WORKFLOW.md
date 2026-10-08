# Two-person development workflow

Both developers and both coding agents follow this file. Tool-specific files add coding conventions; they do not define separate team workflows. Explicit task instructions control scope. Verify architecture claims against source: older feature lists and network instructions may be stale.

## Start a task

1. Confirm the repository with `git rev-parse --show-toplevel` and inspect `git status --short`.
2. Agree on the task owner, acceptance criteria, and affected repositories before overlapping work. Use one feature branch per task in each affected repository. Do not overwrite another developer's edits.
3. Read this file and the repository's agent instructions. Record API, schema, dependency, and environment changes in the task or PR.
4. Agents may edit and check locally. Commit, push, merge, deploy, or change a shared database only when explicitly authorized by the developer.

## Reproducible setup

- Backend: use JDK 21 for BOTH Maven and the running application. Check `java -version` and `mvn -version`; a compiler release setting does not select the runtime. Maven is currently not pinned by a wrapper.
- Frontends: use `npm ci` with the committed `package-lock.json` for normal setup. Use `npm install` only for an intentional dependency change and review its lockfile diff. Run local CLI commands through npm scripts or `npx`, not a global Angular/Expo installation.
- Node/npm versions are not yet standardized across the two frontends. Select and validate versions for each repository together before adding version files; do not assume one version suits both.
- Backend: copy `.env.example` to `.env` on a fresh clone and fill it locally. Never commit secrets or copy another developer's `.env`. Check required variable NAMES against `application.properties`; do not print values in logs or agent responses. Spring does not automatically source a shell `.env`.
- For a shell-compatible backend `.env`, run `set -a`, `source .env`, then `set +a` before starting the backend. Use your own development database/Neon branch. Runtime startup can seed data and update the schema; do not point development at production.
- Mobile network configuration lives in `services/networkConfig.ts`; use `EXPO_PUBLIC_BACKEND_ORIGIN` for an explicit origin. Public frontend variables must not contain secrets. Admin configuration lives in `src/environments/environment*.ts`. Do not replace shared configuration with a personal LAN IP.

## Checks before handoff

Run checks from the corresponding repository and include exact commands and outcomes in the PR:

| Repository | Checks | Start locally |
| --- | --- | --- |
| backend | `mvn clean verify` on JDK 21 | `mvn spring-boot:run` after loading local environment |
| app | `npm run lint` and `npx tsc --noEmit` | `npm start` or `npm run web` |
| admin | `npm run build` plus relevant existing tests | `npm start` |

These are the agreed commands, not a claim that all currently pass. Backend `contextLoads` currently lacks the test profile, and a Java 25 run encountered Mockito agent attachment errors. Make the baseline pass before treating it as a merge gate. `-DskipTests` may help diagnose/build locally; it is not a passing test result. A build alone does not validate device behavior, live providers, or deployment.

For UI/API/WebSocket changes, exercise the affected flow against your development backend. Record platform, backend revision, client revision, and observed result. Mark checks that were not run.

## Changes spanning repositories

Agree on request/response fields, status codes, auth requirements, WebSocket payloads, and compatibility before implementation. Keep examples free of private data. Link the backend and frontend PRs and specify the revisions that work together. Prefer additive API changes so each repository can be merged independently; document ordering when that is impossible. For schema changes, document migration and rollback implications and coordinate the target database before applying them.

## Review and handoff

The other developer reviews each PR. Keep unrelated refactors out. Resolve failures or explicitly record baseline failures; do not silently remove tests or weaken checks to obtain a green build. Before merge, verify the checks against the final branch revision.

Use this handoff template:

- Task / owner:
- Repositories / branches / revisions:
- Behavior changed:
- API / schema / dependency / environment changes:
- Checks run and outcomes:
- Manual reproduction steps:
- Known failures or checks not run:
- Related PRs / merge order:

## Keeping agent instructions aligned

Maintain identical copies of this workflow in backend, app, and admin because they are separate Git repositories. When changing the team policy, update all three in linked PRs. Both `AGENTS.md` and `CLAUDE.md` must point to this file. Treat old roadmap sections as context, not authorization to add features. Report conflicting instructions before making a scope-changing decision.

## Remaining automation work

1. Make all backend context tests use the isolated test profile and verify the full suite on JDK 21.
2. Add a pinned Maven wrapper and a runtime version check.
3. Validate and pin Node/npm per frontend.
4. Add CI in each repository using the same commands above; then enable PR review/check requirements in repository settings.
5. Add a shared API contract and a small cross-repository smoke test for login, equipment status, and WebSocket updates.

These items are pending; this document does not configure CI, repository protections, runtimes, or database isolation automatically.
