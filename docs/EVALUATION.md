# Evaluation methodology and limits

The first course evaluates one narrow function family: TypeScript tags normalization. It is a product/engineering demonstrator, not a benchmark of general coding expertise. Different train/exam seeds produce different data, but not entirely unrelated problems; this is instance-level testing, not evidence of cross-domain transfer. Public tests may be present in model training data. Build new private task instances before making scientific claims.

## Four conditions

Course `maintainer-inputs@1.1` supplies **the same complete acceptance specification to every arm**, including trimming, lowercase normalization, blank removal, stable deduplication, and TypeError on invalid containers/elements. The no-material arm is not deprived of requirements. Teaching material contains procedural methods only. Diagnostic, practice and exam prompts embed this common specification; exam requests differ only by their separately labeled optional learned method. Request-capture tests exercise the real HTTP adapter path to enforce this separation (with a controlled evaluator, not an efficacy measurement).

1. **none**: student receives the task without teacher materials.
2. **docs**: the same student also receives public teacher materials.
3. **static**: a teacher creates one reusable guidance artifact without seeing the student's diagnostic result.
4. **teaching**: a teacher sees diagnostic/practice errors, supplies guidance, and revises it after failed practice.

Each arm has the same student, course seed, maximum request count, token reservation and deadline. Teacher invocations add cost to static/teaching totals. Diagnostics are included in all arms. Practice terminates early when its checks pass. This is a bounded comparison, not equal realized token expenditure. No hidden teacher call is permitted in exams or capability retests.

## Evidence classes

- **Offline fixture**: deterministic demo adapters and simulated checks. Useful for UX and orchestration tests only. Every resulting session/capability is marked simulated, with verified=false.
- **Protocol contract**: mocked Chat/Responses servers exercise request bodies, errors, usage and privacy flags. Not evidence of provider/model performance.
- **Docker execution**: actual isolated execution and independent checks. Tests require `APPRENTICE_TEST_DOCKER=1`; absence is a skip, not a pass.
- **Live model study**: requires explicitly supplied credentials, budget, pinned provider/model settings, multiple fresh task instances and repeated trials. Not conducted merely by running the offline demo.

## Report honestly

Record failures, cancellation, interruption, reported usage, teaching overhead and environment version. Missing pricing is Unknown. A checksum is not an author signature. An imported capability is unverified even when the source claimed success. A retest creates a new record rather than retroactively modifying prior evidence.

Do not claim that this product outperforms static skills until repeated paired tests demonstrate it. Keep model weights/settings fixed, inspect data leakage, and compare the cost against directly hiring a stronger agent to do the task. The meaningful question is whether learned methods work on new tasks after the teacher is disconnected.
