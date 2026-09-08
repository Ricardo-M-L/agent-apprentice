# Agent Apprentice

**Let your personal agent learn from a teacher — then graduate independently.**

[中文](README.zh-CN.md) · [Architecture](docs/ARCHITECTURE.md) · [Security](SECURITY.md) · [Evaluation](docs/EVALUATION.md)

An original, local-first **TypeScript + Electron + React** desktop classroom, with a CLI and versioned teacher API. Connect a student and a teacher, practice with feedback, disconnect the teacher for the exam, and keep an exportable capability record.

> **Research preview, not a claim of AGI or proven transfer.** The bundled offline demo uses deterministic fixtures and is visibly marked **SIMULATED**. No model weights are changed. Real adapters are implemented, but real teaching efficacy must be measured with your explicitly configured models and budget. Passing one narrow task family does not establish general expertise.

## What works

![Learning room — clearly labelled simulated fixture](docs/images/learning-room.png)

*Actual desktop screenshot of the offline simulation; not a live-model benchmark.*

- Five desktop views: learning room, agents, teachers, capability archive, four-arm experiment comparison.
- Persistent diagnosis → teaching → practice → independent exam lifecycle, cancellation, call/token reservations and deadlines.
- OpenAI Chat Completions and Responses adapters. Keys come only from explicitly named environment variables.
- Authenticated REST/SSE coordinator and opt-in remote teacher protocol.
- Docker-only real TypeScript execution: non-root, no network, read-only source, resource limits, no host credential mounts.
- Capability provenance, conditional verification, checksum, import/export, disable/delete and independent retest.
- No telemetry or automatic credential discovery. No mandatory account or hosted backend.

The Metis CLI adapter is deliberately **disabled**, not advertised as working: its isolated execution path has not yet been independently verified. Public teacher marketplace, payments, automatic fine-tuning and general skill certification are not implemented.

## Run from source

Prerequisites: **Node 22.13+**, **pnpm 11.7**. Development is tested on macOS Apple Silicon. Cross-platform support is not yet certified.

```sh
pnpm install --frozen-lockfile
pnpm rebuild:electron
pnpm build
pnpm start
```

The desktop bundles its runtime; an eventual packaged user does not need Node. Current macOS test packages are unsigned and not notarized. Do not disable system security to run an untrusted build.

Click **Start simulated lesson** to explore the complete product without credentials or Docker. Its displayed improvements are fixtures, not real measurements.

### CLI

```sh
node dist/cli.cjs --help
node dist/cli.cjs demo
node dist/cli.cjs compare
node dist/cli.cjs status
node dist/cli.cjs doctor
```

CLI data defaults to `~/.agent-apprentice`; desktop data defaults to Electron's application-data directory. `APPRENTICE_DATA` overrides either. A directory has one coordinator: the second process fails instead of creating a second scheduler. Connect a CLI to an existing coordinator using `--url` and `APPRENTICE_API_TOKEN`.

## Use real models

1. Launch from a terminal that has the model key in an explicitly chosen environment variable. Never paste keys into repository files or provider names.
2. In **My agents**, add student and teacher providers. Enter the variable **name**, model ID, and base URL (typically ending in `/v1`). Optional prices are USD per million tokens; missing prices remain **Unknown**.
3. In **Teachers**, create a teacher profile linked to the teacher provider. Review authorized materials and license.
4. Start Docker and explicitly prepare the exercise image:

```sh
docker pull node:24-alpine
```

5. Select **Real model + isolated Docker execution** and review the transmission consent. Public task text, selected teacher material, generated student attempts and practice feedback go to the configured providers. No private project files are selected.
6. Run a lesson or comparison. All four conditions use the selected student and task budget; teaching overhead is included. Unknown usage remains unknown. Byte-based token reservations are conservative, not exact tokenizer counts or dollar caps.

The current original course is a narrow TypeScript tags-validation library. See [the course](examples/maintainer-course/README.md) and [evaluation limits](docs/EVALUATION.md).

If using Colima or another Docker context, explicitly set the corresponding `DOCKER_HOST` when launching the application. Source and test inputs are streamed over stdin and TypeScript is processed inside the container. No host directory is mounted, and no host-execution fallback exists.

## Remote teaching

Generate two distinct random tokens: `APPRENTICE_API_TOKEN` for your administrator CLI, and `APPRENTICE_TEACHER_TOKEN` for students. Never give students the administrator token. Then:

```sh
node dist/cli.cjs serve --port 4318 --teacher-provider my-teacher
node dist/cli.cjs --url http://127.0.0.1:4318 status
```

The service binds only to loopback. Remote deployment requires your authenticated HTTPS reverse proxy; expose only `/v1/teach` and preserve a loopback Host accepted by the service. The teaching credential cannot access administration or events. Teaching is capped at 100 lifetime attempts, two concurrent calls, 30 seconds/call, 600 requested output tokens/call, and a finite lifetime reservation budget; CLI flags can lower limits. There is no unauthenticated public discovery. See [protocol](docs/PROTOCOL.md) for exact limits and permission boundaries.

## Development and verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm rebuild:electron
pnpm test:e2e
APPRENTICE_TEST_DOCKER=1 pnpm test
pnpm pack:dir
pnpm smoke:packaged
```

Docker tests are explicitly gated and report skipped when not enabled. They test actual execution/isolation, not teaching quality. Electron and Node have separate SQLite copies because their native ABIs differ; `scripts/rebuild-electron.mjs` rebuilds only the Electron copy. Run it again after dependency reinstalls. Do not use an unscoped `electron-rebuild` across both copies.

## Open source

Apache-2.0 for this original implementation and course. Dependencies retain their own licenses. Agent Teams AI inspired the desktop/runtime separation; no AGPL source or assets were copied. Teaching materials and model access must be independently authorized. See [contributing](CONTRIBUTING.md).
