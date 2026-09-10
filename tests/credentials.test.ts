import { test, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CredentialVault } from "../apps/desktop/src/main/credentials";
import { resolveKey } from "../packages/adapters/index";
const provider = {
  id: "private",
  name: "Private",
  kind: "anthropic" as const,
  model: "test",
  baseUrl: "https://example.test",
};
test("encrypted vault persists, binds credentials to endpoint, replaces/removes and never stores plaintext", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vault-test-"));
  const master = randomBytes(32);
  const encryption = {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => {
      const iv = randomBytes(12),
        c = createCipheriv("aes-256-gcm", master, iv);
      const out = Buffer.concat([c.update(text, "utf8"), c.final()]);
      return Buffer.concat([iv, c.getAuthTag(), out]);
    },
    decryptString: (b: Buffer) => {
      const d = createDecipheriv("aes-256-gcm", master, b.subarray(0, 12));
      d.setAuthTag(b.subarray(12, 28));
      return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString();
    },
  };
  try {
    const vault = new CredentialVault(dir, encryption);
    const ref = vault.put(provider, "dummy-key-123456");
    const p = { ...provider, credentialRef: ref };
    expect(vault.get(p)).toBe("dummy-key-123456");
    expect(readFileSync(vault.path, "utf8")).not.toContain("dummy-key");
    expect(statSync(vault.path).mode & 0o777).toBe(0o600);
    expect(new CredentialVault(dir, encryption).get(p)).toBe(
      "dummy-key-123456",
    );
    expect(() => vault.get({ ...p, baseUrl: "https://other.test" })).toThrow(
      /does not match/,
    );
    await expect(resolveKey(p)).rejects.toThrow(/desktop/);
    const replacement = vault.put(provider, "replacement");
    vault.remove(ref);
    expect(vault.has(p)).toBe(false);
    expect(vault.get({ ...provider, credentialRef: replacement })).toBe(
      "replacement",
    );
    vault.remove(replacement);
    expect(readFileSync(vault.path, "utf8")).toBe("{}");
    for (const backend of [
      { ...encryption, isEncryptionAvailable: () => false },
      { ...encryption, getSelectedStorageBackend: () => "basic_text" },
    ])
      expect(() =>
        new CredentialVault(dir, backend).put(provider, "private"),
      ).toThrow(/unavailable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
