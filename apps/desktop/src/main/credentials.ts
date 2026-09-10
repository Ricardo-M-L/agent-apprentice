import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Provider } from "../../../../packages/protocol/index";
export interface Encryption {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend?(): string;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
export class CredentialVault {
  readonly path: string;
  constructor(
    directory: string,
    private encryption: Encryption,
  ) {
    this.path = join(directory, "credentials.enc.json");
  }
  available() {
    return (
      this.encryption.isEncryptionAvailable() &&
      this.encryption.getSelectedStorageBackend?.() !== "basic_text"
    );
  }
  private requireSecure() {
    if (!this.available())
      throw new Error(
        "System secure storage is unavailable; plaintext storage is disabled.",
      );
  }
  private read(): Record<string, string> {
    this.requireSecure();
    if (!existsSync(this.path)) return {};
    try {
      const value = JSON.parse(readFileSync(this.path, "utf8"));
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.values(value).some((v) => typeof v !== "string")
      )
        throw new Error();
      return value;
    } catch {
      throw new Error("Cannot read secure credential store");
    }
  }
  private write(value: Record<string, string>) {
    this.requireSecure();
    mkdirSync(join(this.path, ".."), { recursive: true, mode: 0o700 });
    const tmp = this.path + "." + randomUUID() + ".tmp";
    try {
      writeFileSync(tmp, JSON.stringify(value), { mode: 0o600, flag: "wx" });
      chmodSync(tmp, 0o600);
      renameSync(tmp, this.path);
    } finally {
      if (existsSync(tmp)) unlinkSync(tmp);
    }
  }
  put(provider: Provider, key: string): string {
    const values = this.read(),
      ref = randomUUID();
    values[ref] = this.encryption
      .encryptString(
        JSON.stringify({
          key,
          id: provider.id,
          kind: provider.kind,
          baseUrl: provider.baseUrl,
        }),
      )
      .toString("base64");
    this.write(values);
    return ref;
  }
  remove(ref: string) {
    const values = this.read();
    delete values[ref];
    this.write(values);
  }
  get(provider: Provider): string {
    try {
      const encrypted = this.read()[provider.credentialRef!];
      if (!encrypted) throw new Error();
      const value = JSON.parse(
        this.encryption.decryptString(Buffer.from(encrypted, "base64")),
      );
      if (
        value.id !== provider.id ||
        value.kind !== provider.kind ||
        value.baseUrl !== provider.baseUrl ||
        typeof value.key !== "string"
      )
        throw new Error();
      return value.key;
    } catch {
      throw new Error(
        "Saved credential is missing, locked or does not match this endpoint. Save the API key again.",
      );
    }
  }
  has(provider: Provider) {
    try {
      this.get(provider);
      return true;
    } catch {
      return false;
    }
  }
}
