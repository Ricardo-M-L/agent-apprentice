# Architecture

## Trust and process boundaries

The renderer has no Node API. It uses a frozen preload bridge with exactly two operations: typed commands and event subscription. The main process validates the IPC sender, top-level frame, exact local document URL and command schema. Navigation, new windows and permission requests are blocked. A restrictive CSP disallows renderer network requests.

The Electron utility process owns the Engine and SQLite connection. Heavy course code never executes in this process. A CLI may own its own coordinator when the desktop is not using the same directory; otherwise it connects to the authenticated API. A PID lock prevents a second writer. Stale owners are only removed after checking the old PID is absent. Sessions that were queued/running at startup become interrupted; they are not replayed.

`packages/core` has no Electron dependency. It serializes sessions, tracks abort controllers, persists phase changes and records events. Model HTTP calls are made by the coordinator with explicit environment credentials. Student source runs only through `packages/sandbox`.

## Execution and evaluation

The built-in course produces TypeScript source. Source and challenge inputs travel over stdin to a non-root Docker container; no host folder is mounted. TypeScript is stripped using Node's built-in API inside the container. Expected answers stay in the coordinator. The evaluator receives JSON outputs and compares against independent expectations. Limits include 1 CPU, 128 MB RAM, 32 PIDs, 64 file descriptors, 15 seconds and bounded stdout/stderr. Containers have no network, capabilities or host socket. Abort triggers named-container removal.

This is defense in depth, not a claim of perfect containment. Host Docker is a privileged trust dependency. The learner's executable receives test inputs during evaluation; those inputs cannot be secret from the executing function. Published tests cannot remain globally secret.

## Native SQLite

The workspace keeps `better-sqlite3` for Node CLI/tests and a distinct version aliased as `sqlite-electron` for Electron. The scoped native rebuild script stages only the latter before invoking Electron rebuild. Never suppress native build errors. Drizzle owns the typed database representation; direct prepared SQLite statements persist bounded serialized domain objects and an append-only event log. Database schema version is recorded via `user_version`.

## State and failure handling

- Validated config and capability objects are persisted; no credential values are included.
- Each queued session snapshots its selected provider/teacher objects before execution.
- Request attempts consume call budget even when the network fails.
- Input bytes + maximum output tokens are reserved before requests; this is conservative and distinct from reported token usage.
- Missing upstream usage or configured prices propagate as Unknown, not zero.
- Cancel, deadline and shutdown propagate abort signals; no automatic retries can secretly exceed budget.
- Completion means a run ended; `verified` additionally requires all real exam checks. Simulated runs never earn verified status.

## UI and services

Zustand stores current navigation and snapshot selection. Durable state always lives in SQLite, not renderer memory. The optional Fastify API uses a long explicit bearer token, loopback binding, Host checks and Origin rejection. A teacher endpoint is enabled only with an explicitly selected provider. Use separate coordinator directories for different trust domains: the current API token authorizes the entire workspace.

The source modules are pnpm workspace members, built together by the root package. They are not independently published npm packages. The build uses Vite for renderer resources and esbuild for Node/Electron entry points. Electron-builder packages the runtime and external dependencies.
