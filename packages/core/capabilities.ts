import { createHash } from "node:crypto";
import { CapabilitySchema, type Capability } from "../protocol/index";
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export function seal(body: Omit<Capability, "checksum">): Capability {
  return CapabilitySchema.parse({
    ...body,
    checksum: createHash("sha256").update(canonical(body)).digest("hex"),
  });
}
export function importCapability(json: string): Capability {
  if (Buffer.byteLength(json) > 200000)
    throw new Error("Capability exceeds 200 KB");
  const value = CapabilitySchema.parse(JSON.parse(json));
  const { checksum, ...body } = value;
  if (seal(body).checksum !== checksum)
    throw new Error("Capability checksum mismatch");
  return seal({ ...body, enabled: false, verified: false });
}
export function toggleCapability(value: Capability, enabled: boolean) {
  const { checksum: _, ...body } = value;
  return seal({ ...body, enabled });
}
