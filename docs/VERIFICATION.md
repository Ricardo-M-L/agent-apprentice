# Implementation verification · 2026-09-09

These are local implementation checks, not an independent security certification or a live-model learning study.

## Passed locally

- TypeScript strict typecheck and ESLint.
- 30 tests across core lifecycle, capability integrity/disable/retest, protocol adapters, separated administrator/teacher authorization and bounded teacher service, UTF-8 chunk decoding, four-arm prompt fairness, SSE shutdown, React behavior and real Docker evaluation.
- Docker tests were explicitly enabled against an existing isolated Colima Docker daemon (29.5.2), using the explicitly pulled `node:24-alpine` image. They executed TypeScript, detected defective code, cancelled a nonterminating student and checked that host credential/socket access was absent.
- Playwright Electron E2E: real window startup, sandboxed renderer without `require`, simulated teaching, capability archive, disable, restart persistence, four-arm comparison, provider configuration.
- CLI simulated lesson completed using the Node-native SQLite copy after the Electron-native copy was rebuilt.
- macOS arm64 application, DMG and ZIP built with the original project icon. **Unsigned, not notarized.**
- Packaged application smoke: application starts, native SQLite works, simulated lesson completes, capability survives exit/restart.
- Production dependency inventory contained MIT, Apache-2.0, BSD-3-Clause, ISC and 0BSD declarations. See `THIRD_PARTY_NOTICES.md`.
- Source search found no personal absolute paths, private-key headers or obvious GitHub/OpenAI key prefixes. This is a heuristic check, not a guarantee of complete secret detection.

## Release-blocker corrections

An independent review rejected the initial implementation for shared teacher/admin credentials, unequal acceptance specifications across experimental arms, and broken UTF-8 decoding across response chunks. These were fixed before this validation rerun:

- Distinct teacher credentials can invoke only `/v1/teach`; regression checks deny snapshots, provider updates, events and health. Teacher requests cannot select a provider endpoint or secret environment variable. Startup snapshots the chosen provider.
- Teacher service has finite per-lifetime attempts/reservations, bounded concurrency, input/output sizes and timeout. Failed attempts remain charged.
- Course `maintainer-inputs@1.1` puts all acceptance rules into the task given to every arm. Teaching material adds methods only. A real-adapter request-capture regression verifies identical exam specifications and no extra method in the baseline; its evaluator is a controlled fixture, not a claim of learning efficacy.
- A persistent streaming TextDecoder preserves Chinese/emoji even with single-byte chunks. The response cap counts actual bytes.

After the fixes, `pnpm check` passed (26 tests, four Docker tests explicitly skipped), the explicitly enabled Docker run passed all 30 tests, Electron E2E passed, and `pnpm pack:mac` plus `pnpm smoke:packaged` passed against rebuilt unsigned macOS arm64 artifacts. Independent re-review and publication remain release-owner responsibilities.

## Not established

- No real paid model invocation or real teaching-efficacy study was performed. Chat/Responses adapters were verified against controlled protocol responses. Offline fixtures never earn real verified status.
- The built-in course is a narrow function family, not a general coding benchmark.
- Metis isolated CLI execution remains disabled.
- Windows/Linux desktop packages were not runtime-tested.
- No public teacher marketplace, signing infrastructure, payments or fine-tuning exists.
- Independent review and GitHub publication are separate remaining release-owner steps.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm rebuild:electron
pnpm typecheck
pnpm lint
pnpm test
# Prepare your own Docker daemon/context, then:
docker pull node:24-alpine
APPRENTICE_TEST_DOCKER=1 pnpm test
pnpm test:e2e
pnpm pack:mac
pnpm smoke:packaged
```

If Docker is not the default daemon, explicitly set `DOCKER_HOST`. No global Docker context was changed for these tests. The ordinary unit-test command reports four Docker checks as skipped unless explicitly enabled.
