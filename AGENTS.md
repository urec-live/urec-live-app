# Agent instructions

Read `docs/TEAM_WORKFLOW.md` for the shared team workflow and `CLAUDE.md` for repository coding conventions. Verify architecture notes against current source and stay within the requested task.

## Commit evidence

Every commit message must include a `Manual test:` section in its body. State the shortest reproducible steps, expected result, and any required local account, environment, or provider prerequisite. If no manual test is appropriate, say why and record the automated validation instead. Keep the subject line concise; do not substitute a PR description for commit-level test instructions.

When a new commit is pushed to an existing PR, update that PR's description whenever the commit changes its scope, behavior, validation, rollout, or review guidance. Do not leave a PR description that is materially stale; a trivial correction that changes none of those does not require an edit.

## Local handoff

At the end of an implementation task, restart the relevant local service or services from the changed branch before handoff. Confirm the applicable health endpoint or page is reachable, then provide the local URL and focused manual-test steps. Do not present a successful build as proof that a restarted service, provider integration, or production deployment works.

## Standalone clone and active scope

This repository is independently versioned. Its `AGENTS.md`, `docs/TEAM_WORKFLOW.md`, and `CLAUDE.md` travel with the clone and contain the applicable guidance for Codex and Claude Code. No parent workspace instructions, personal absolute paths, or sibling checkout are required. Run commands from this repository root unless stated otherwise. Read `CLAUDE.md` for repository coding conventions; verify historical inventories and roadmap notes against source before relying on them.

The active UREC Live repositories are `backend` (Spring Boot API), `app` (native member client), and `admin` (staff web dashboard). Clone a companion repository separately only when the task needs it; record compatible revisions and configure its origin rather than assuming a sibling path. Work on `scheduling-experiments` and `urec-live-cv` is on hold: do not plan, modify, run, or validate either without an explicit request to resume it. Existing CV integration settings do not authorize running the CV project.

The member app targets native iOS and Android only. Do not design, implement, or validate member-app desktop/browser UI, desktop responsive layouts, or web compatibility unless the user explicitly changes scope. Existing web scripts/dependencies do not change this rule. Validate member UI on a native simulator, emulator, or device. The separate admin dashboard remains a web application.

## Repository quick reference

- Native iOS/Android member app: React Native 0.81.5, Expo 54, expo-router, TypeScript, Context, Axios, and STOMP. Follow the coding/cache conventions in `CLAUDE.md`; keep network calls in services and preserve the shared network resolver.
- Setup: `npm ci`, install the platform toolchain, and use the tracked `ios/` or `android/` projects. Read `docs/TEAM_WORKFLOW.md` before prebuild/regeneration; native source is tracked, while local build outputs/configuration are ignored.
- Commands: `npm start` (Metro), `npm run ios` or `npm run android`, `npm run lint`, `npx tsc --noEmit`, and `npm test -- --runInBand` for relevant Jest coverage. Neither a Jest pass nor Metro availability proves native UI works.
- Network origin is resolved only in `services/networkConfig.ts`: local `EXPO_PUBLIC_BACKEND_ORIGIN` override, then Expo host discovery, then platform fallback. Supply an origin without `/api` or `/ws`; restart Metro after environment changes. See the workflow for simulator/emulator/device addresses.
- A separately running compatible backend is needed for API/auth/live flows. Native provider configuration is separate from a successful JavaScript build; see repository testing/setup guides for the affected integration and record prerequisites still missing.
