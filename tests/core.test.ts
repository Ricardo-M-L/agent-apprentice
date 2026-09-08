import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Engine } from "../packages/core/index";
import {
  LearnSchema,
  CommandSchema,
  type Capability,
  type Session,
} from "../packages/protocol/index";
import { importCapability } from "../packages/core/capabilities";
const resources: Array<{ engine: Engine; dir: string }> = [];
function make() {
  const dir = mkdtempSync(join(tmpdir(), "apprentice-test-"));
  const engine = new Engine(dir);
  resources.push({ engine, dir });
  return engine;
}
afterEach(async () => {
  for (const { engine, dir } of resources.splice(0)) {
    try {
      await engine.close();
    } catch {
      /* already closed by restart test */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
const options = () =>
  LearnSchema.parse({ studentId: "demo-student", teacherId: "maintainer" });
describe("teaching lifecycle", () => {
  it("graduates a visibly simulated session and exports provenance without raw attempts", async () => {
    const e = make();
    const s = e.start(options());
    await e.wait(s.id);
    const final = e.store.get<Session>("session", s.id)!;
    expect(final.status).toBe("completed");
    expect(final.simulated).toBe(true);
    expect(final.results).toHaveLength(6);
    const cap = e.store.get<Capability>("capability", final.capabilityId!)!;
    expect(cap.verified).toBe(false);
    expect(cap.simulated).toBe(true);
    expect(cap.conditions.model).toBe("fixture-student");
    const events = e.store.events(s.id);
    const examIndex = events.findIndex((x) => x.kind === "exam");
    expect(events.slice(examIndex + 1).some((x) => x.kind === "teaching")).toBe(
      false,
    );
    expect(
      await e.dispatch({ type: "capability.export", id: cap.id }),
    ).not.toContain("Bearer");
  });
  it("runs all four arms with matched options and separately recorded costs", async () => {
    const e = make();
    const runs = await e.dispatch({ type: "compare", value: options() });
    await Promise.all(runs.map((s: Session) => e.wait(s.id)));
    const sessions = e.store.snapshot().sessions;
    expect(sessions).toHaveLength(4);
    expect(sessions.every((s) => s.status === "completed")).toBe(true);
    expect(new Set(sessions.map((s) => s.options.studentId)).size).toBe(1);
    expect(new Set(sessions.map((s) => s.options.maxTokens)).size).toBe(1);
    expect(
      sessions
        .find((s) => s.options.arm === "none")!
        .results.filter((x) => x.passed).length,
    ).toBe(1);
  });
  it("cancels queued and running jobs and leaves no successful capability", async () => {
    const e = make();
    const s = e.start(options());
    await e.dispatch({ type: "cancel", id: s.id });
    await e.wait(s.id);
    expect(e.store.get<Session>("session", s.id)!.status).toBe("cancelled");
    expect(e.store.snapshot().capabilities).toHaveLength(0);
  });
  it("enforces budget before additional model calls", async () => {
    const e = make();
    const s = e.start({ ...options(), maxCalls: 1 });
    await e.wait(s.id);
    const final = e.store.get<Session>("session", s.id)!;
    expect(final.status).toBe("failed");
    expect(final.usage.calls).toBe(1);
    expect(final.error).toMatch(/budget/);
  });
  it("refuses mixing mock providers and real sandbox claims", () => {
    const e = make();
    expect(() =>
      e.start({ ...options(), execution: "docker", consent: true }),
    ).toThrow(/simulated/);
  });
  it("preserves sessions across restart and marks in-flight work interrupted", async () => {
    const e = make();
    const s = e.start(options());
    await e.wait(s.id);
    const original = e.store.get<Session>("session", s.id)!;
    e.store.put("session", { ...original, status: "running" });
    const dir = e.store.directory;
    await e.close();
    const reopened = new Engine(dir);
    resources[resources.length - 1].engine = reopened;
    expect(reopened.store.get<Session>("session", s.id)!.status).toBe(
      "interrupted",
    );
  });
  it("prevents a second coordinator writing the same directory", () => {
    const e = make();
    expect(() => new Engine(e.store.directory)).toThrow(/Another coordinator/);
  });
});
describe("capabilities and input boundaries", () => {
  it("rejects tampering and imports without overwriting or trusting verification", async () => {
    const e = make();
    const s = e.start(options());
    await e.wait(s.id);
    const cap = e.store.snapshot().capabilities[0];
    expect(() =>
      importCapability(JSON.stringify({ ...cap, method: "changed" })),
    ).toThrow(/checksum/);
    const restored = importCapability(JSON.stringify(cap));
    expect(restored.enabled).toBe(false);
    expect(restored.verified).toBe(false);
    await expect(
      e.dispatch({ type: "capability.import", json: JSON.stringify(cap) }),
    ).rejects.toThrow(/exists/);
  });
  it("disabled capabilities cannot be used; retest bypasses teacher", async () => {
    const e = make();
    const s = e.start(options());
    await e.wait(s.id);
    const cap = e.store.snapshot().capabilities[0];
    await e.dispatch({ type: "capability.toggle", id: cap.id, enabled: false });
    expect(() => e.start({ ...options(), capabilityId: cap.id })).toThrow(
      /disabled/,
    );
    await e.dispatch({ type: "capability.toggle", id: cap.id, enabled: true });
    const retest = e.start({ ...options(), capabilityId: cap.id });
    await e.wait(retest.id);
    expect(e.store.events(retest.id).some((x) => x.kind === "teaching")).toBe(
      false,
    );
  });
  it("rejects path IDs, arbitrary commands and unknown privileged fields", () => {
    expect(() =>
      CommandSchema.parse({ type: "capability.export", id: "../../secret" }),
    ).toThrow();
    expect(() =>
      CommandSchema.parse({ type: "shell", command: "rm" }),
    ).toThrow();
    expect(() =>
      CommandSchema.parse({ type: "snapshot", path: "/etc/passwd" }),
    ).toThrow();
  });
});
