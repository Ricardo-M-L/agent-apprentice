# Security policy

This is a research-preview desktop application that can invoke paid model APIs and a local Docker daemon. Only use it with materials and endpoints you trust and are authorized to access. Container isolation is defense in depth, not a formal security guarantee.

## Defaults

- No telemetry, account registration, public server, automated update or credential scanning.
- Renderer has no Node integration; sandbox/context isolation and narrow validated IPC are enabled.
- Teacher material, model output and imported packages are untrusted. Import never runs code.
- Real exercise code runs only in named, resource-limited, non-root Docker containers with no network and no host secrets/socket mounts.
- Desktop direct API keys are encrypted by Electron `safeStorage` (macOS Keychain-backed) in `app.getPath("userData")/credentials.enc.json`, with atomic writes and mode 0600. System encryption unavailable or Linux `basic_text` backend means saving fails closed; no plaintext fallback. Provider configuration stores an opaque reference, not the key. The renderer never receives saved plaintext; only the coordinator obtains it for the matching provider ID, protocol and endpoint. Replacing a key retires its old reference; removing it leaves the provider unconfigured.
- Explicit environment-variable authentication remains supported, including CLI. The app never writes shell/global environment configuration, other applications' settings, or stored keys into `process.env`. CLI cannot unlock desktop saved-key references.
- Saved ciphertext is not a portable credential backup: it depends on the operating-system user/keychain. The application database, event records and user materials are not encrypted by this vault.
- API tokens protect the entire local workspace, including configuration. Do not share a token as a limited teaching-only credential. Use separate directories/tokens or an independently reviewed proxy.
- Remote transmission requires explicit user consent describing public task, selected material, attempt and feedback.
- Capability checksums detect modification, not publisher identity. Imported claims are downgraded until revalidated.

## Remaining boundaries

A malicious upstream provider or vulnerable Docker/Electron dependency can still compromise trust. User-provided teaching material could itself contain secrets: the application cannot guarantee automatic removal of all private information. Review materials before sending or exporting. Application data includes your materials and event logs; protect backups and disk access. The SQLite database is not encrypted by this project. Export is narrower than the local event history.

Model errors are bounded and common credential patterns are redacted, but never deliberately place secrets in prompt text, display names or arbitrary metadata. Don't expose the coordinator to the public internet without a security review. Close the application to cancel active lessons; interrupted work is not automatically replayed.

Report suspected vulnerabilities privately using the repository's Security advisory reporting if enabled. If unavailable, open an issue requesting a private contact **without exploit details or secrets**. Do not publish working credential-exfiltration payloads in ordinary issues.

Unsigned macOS test packages are not notarized. Do not disable operating-system protection to run an untrusted download.
