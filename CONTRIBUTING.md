# Contributing

Contributions should improve independently verifiable learning, not merely add model badges or inflate simulated results.

1. Use Node 22.13+ and pnpm 11.7. Install with the lockfile, then run the scoped Electron SQLite rebuild.
2. Keep renderer code free of Node privileges. Add all IPC/API commands to the protocol schema and tests.
3. Do not read existing CLI credential stores or inherit secrets into course containers.
4. Add independent task verifiers and disclose train/test overlap. Do not give expected exam outputs to the teacher or learner.
5. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm rebuild:electron`, `pnpm test:e2e`.
6. For sandbox changes also run `APPRENTICE_TEST_DOCKER=1 pnpm test` against a prepared Docker image. Skipped tests must be reported as skipped.
7. For packaging changes run `pnpm pack:dir` and `pnpm smoke:packaged`. Development-only success is insufficient.
8. Format source with `pnpm exec prettier --write apps packages tests scripts '*.ts' '*.json'` and regenerate schemas if protocol changes.

Never commit keys, user data, private source, absolute personal paths, generated databases, build directories or raw model sessions. Only include teaching materials with redistribution rights. This repository is original Apache-2.0 code, not a relicensed copy of an AGPL desktop app. Contributions retain dependency and source attribution obligations.

Before reporting performance improvements, compare the same student/model settings under no-material, docs, static-skill and teaching conditions, include teacher cost, and disclose failed trials.
