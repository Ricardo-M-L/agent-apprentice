# Protocol v1.0

Runtime authority lives in `packages/protocol/index.ts` (Zod). `node scripts/schemas.mjs` regenerates the JSON Schemas under `schemas/`.

## Private coordinator

All HTTP routes require `Authorization: Bearer <APPRENTICE_API_TOKEN>` (minimum 32 characters). Use random tokens, do not commit them. Requests with Origin headers or non-loopback Host headers are rejected. Default maximum JSON request body is 220 KB. No unauthenticated health endpoint exists.

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
