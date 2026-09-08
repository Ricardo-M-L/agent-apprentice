import { describe, it, expect } from "vitest";
import { evaluate, environment } from "../packages/sandbox/index";
import { referenceCode, weakCode } from "../packages/evaluation/course";
const enabled = process.env.APPRENTICE_TEST_DOCKER === "1";
describe.skipIf(!enabled)("real fail-closed Docker evaluation", () => {
  it("runs TypeScript on distinct hidden inputs with no expected answers mounted", async () => {
    expect((await environment()).docker).toBe(true);
    const result = await evaluate(
      referenceCode(),
      12345,
      new AbortController().signal,
    );
    expect(result).toHaveLength(6);
    expect(result.every((r) => r.passed)).toBe(true);
  }, 30000);
  it("detects defective source independently", async () => {
    const result = await evaluate(
      weakCode(),
      9876,
      new AbortController().signal,
    );
    expect(result.some((r) => !r.passed)).toBe(true);
  }, 30000);
  it("kills a non-terminating student when cancelled", async () => {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 1200);
    try {
      await expect(
        evaluate(
          "export function normalizeTags(_: unknown): string[] {while(true){} }",
          0,
          c.signal,
        ),
      ).rejects.toThrow(/Cancelled/);
    } finally {
      clearTimeout(timer);
    }
  }, 30000);
  it("does not expose host home or provider credentials to student code", async () => {
    const code = `import fs from 'node:fs'; export function normalizeTags(input:unknown):string[]{if(process.env.APPRENTICE_TEST_KEY || fs.existsSync('/var/run/docker.sock'))throw new Error('unsafe');${referenceCode().split("{").slice(1).join("{")}`;
    const result = await evaluate(code, 42, new AbortController().signal);
    expect(result.every((r) => r.passed)).toBe(true);
  }, 30000);
});
