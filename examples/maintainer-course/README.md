# Maintainer foundations · original course

License: Apache-2.0. Author: Agent Apprentice contributors.

Task: implement `normalizeTags(input: unknown): string[]` for a small TypeScript library. The maintainer's public documentation specifies array/type validation, whitespace trimming, lowercasing, empty-value filtering, stable deduplication, and TypeError semantics.

The task/material generator is `packages/evaluation/course.ts`. Practice and independent exam use different deterministic input seeds. The evaluator's expected values stay in the coordinator, outside the student directory. The function necessarily sees input values during execution; published tests are not globally secret.

This example demonstrates teacher/learner separation and verification. It does **not** establish broad programming ability or cross-domain transfer. Add unrelated, newly authored held-out tasks and repeated live-model trials before making those claims.

The demo provider supplies deterministic source and simulated checks, visibly labeled as such. Docker tests run the actual generated TypeScript and evaluate it independently. The `starter.ts` below is intentionally incomplete and is not the solution.
