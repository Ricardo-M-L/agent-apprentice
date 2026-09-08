# Protocol v1.0

Runtime authority lives in `packages/protocol/index.ts` (Zod). `node scripts/schemas.mjs` regenerates the JSON Schemas under `schemas/`.

## Private coordinator

Administrator HTTP routes require `Authorization: Bearer <APPRENTICE_API_TOKEN>` (minimum 32 characters). Use random tokens, do not commit them. Requests with Origin headers or non-loopback Host headers are rejected. Default maximum JSON request body is 220 KB. No unauthenticated health endpoint exists.

- `GET /health`: application version and readiness.
- `POST /v1/command`: one discriminated typed command; no arbitrary paths, shell or SQL.
- `GET /v1/events`: SSE events while connected. Use `events` command with session ID to recover persisted events after reconnect; live SSE itself has no replay cursor.
- `POST /v1/teach`: enabled only when the service operator chooses a local teacher provider. This can incur model charges for authorized requests; it is not a free public inference endpoint.

Example command body:

```json
{"type":"learn","value":{"studentId":"student","teacherId":"maintainer-real","execution":"docker","consent":true,"arm":"teaching","rounds":2,"maxTokens":16000,"maxCalls":12,"timeoutSeconds":180,"seed":42}}
```

`learn` and `compare` return session records immediately. Query `snapshot` or listen for events. A local standalone CLI waits for completion; a CLI attached with `--url` receives session IDs and can query status. `cancel` needs the running coordinator, not a different empty directory.

## Teacher interchange

### Separate authorization

Teaching uses **a different token** from administration. `APPRENTICE_API_TOKEN` authorizes only `/health`, `/v1/command` and `/v1/events`. `APPRENTICE_TEACHER_TOKEN` authorizes only `POST /v1/teach`: no snapshot, settings, provider changes, administrative tasks, events or health access. The administrator token is not accepted on the teaching route. Both tokens must have at least 32 characters; enabling teaching with a missing or reused token fails startup.

```sh
export APPRENTICE_API_TOKEN="$(openssl rand -hex 32)"
export APPRENTICE_TEACHER_TOKEN="$(openssl rand -hex 32)"
node dist/cli.cjs serve --teacher-provider my-configured-provider \
  --teacher-token-env APPRENTICE_TEACHER_TOKEN \
  --teacher-max-requests 100 --teacher-max-concurrent 2 \
  --teacher-max-reserved-tokens 1300000
```

Generate credentials locally and never log them. Share only the teaching token. The provider, endpoint and credential environment variable are fixed by the operator at startup, not supplied by students.

### Finite service budget

The teacher endpoint caps each server lifetime at 100 upstream attempts (including failures), two concurrent calls, 30 seconds per call, 12,000 UTF-8 input bytes, 600 requested output tokens and 12,000 UTF-8 guidance bytes. Each request reserves input bytes plus system bytes, protocol allowance and requested output tokens before inference. The lifetime reservation cap is 1,300,000; this is conservative resource accounting, not exact token billing or a dollar guarantee. Failures do not refund reservations. CLI flags may lower, but not exceed, default limits. Operator restart explicitly grants a new finite budget.

Exhausted budget/concurrency returns 429; oversized input returns 413; invalid protocol fields return 400. A TLS reverse proxy should expose **only `/v1/teach`**, never administrator routes. Authentication and bounded calls do not establish cross-user trust.

```json
{"version":"1.0","material":"Authorized teacher material","studentAttempt":"Student's generated attempt","feedback":"Practice feedback","task":"Public practice description"}
```

Response:

```json
{"version":"1.0","guidance":"Reusable method, not a hidden exam answer","simulated":false}
```

Remote teacher providers name an explicit HTTPS base URL and token environment variable. Only loopback may use HTTP. A local service can be exposed through an operator-configured authenticated TLS reverse proxy; public discovery, signing infrastructure and cross-user trust are not implemented. Expected exam outputs are never included in this protocol.

## Capability package

Capability JSON is a bounded data object, not a zip or executable installer. It includes version, ID, method, license/source, environment conditions, results, enabled/verified/simulated status, creation time and a SHA-256 canonical-content checksum. Import validates schema and checksum, refuses collisions, and resets enabled/verified to false. Imported methods are untrusted data; the package is not automatically executed. Schema version mismatch fails closed.

Methods are external procedural guidance, not model weights. Nothing here certifies expertise outside the recorded task/environment. Do not redistribute material you are not authorized to share.
