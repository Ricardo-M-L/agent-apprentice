import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Engine } from "../packages/core/index";
import { LearnSchema, type Session } from "../packages/protocol/index";
import {
  material,
  referenceCode,
  specification,
  task,
} from "../packages/evaluation/course";
// Isolate protocol/prompt fairness from Docker availability. The real HTTP adapter
// remains in use with captured requests; these checks are not efficacy results.
vi.mock("../packages/sandbox/index", () => ({
  environment: async () => ({ docker: true, imageReady: true }),
  evaluate: async () => [
    {
      name: "fixture verifier",
      passed: true,
      detail: "Controlled test verifier; not learning efficacy",
    },
  ],
  simulatedEvaluation: () => {
    throw new Error("Real path must not simulate");
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.APPRENTICE_TEST_KEY;
});
it("sends the identical complete exam specification to all four real-adapter arms", async () => {
  const dir = mkdtempSync(join(tmpdir(), "apprentice-fairness-"));
  const engine = new Engine(dir);
  process.env.APPRENTICE_TEST_KEY = "test-only";
  const calls: Array<{
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
  }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  body.model === "teacher"
                    ? "METHOD-MARKER: separate validation from mapping"
                    : referenceCode(),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 100 },
        }),
      );
    }),
  );
  try {
    for (const role of ["student", "teacher"])
      engine.store.put("provider", {
        id: role,
        name: role,
        kind: "chat",
        baseUrl: "https://fixture.example/v1",
        model: role,
        keyEnv: "APPRENTICE_TEST_KEY",
      });
    engine.store.put("teacher", {
      id: "instructor",
      name: "Instructor",
      providerId: "teacher",
      description: "Methods only",
      scope: "validation",
      license: "Apache-2.0",
      material,
    });
    const options = LearnSchema.parse({
      studentId: "student",
      teacherId: "instructor",
      execution: "docker",
      consent: true,
      seed: 7,
    });
    const sessions = (await engine.dispatch({
      type: "compare",
      value: options,
    })) as Session[];
    await Promise.all(sessions.map((s) => engine.wait(s.id)));
    expect(
      engine.store
        .snapshot()
        .sessions.map((s) => ({ status: s.status, error: s.error ?? null })),
    ).toEqual(
      Array.from({ length: 4 }, () => ({ status: "completed", error: null })),
    );
    const exams = calls.filter(
      (c) =>
        c.model === "student" &&
        c.messages[1].content.includes("Independent graduation task"),
    );
    expect(exams).toHaveLength(4);
    const common = task(options.seed + 7919, true).description;
    for (const exam of exams) {
      expect(exam.messages[1].content.split("\nLEARNED METHOD\n")[0]).toBe(
        common,
      );
      expect(exam.messages[1].content).toContain(specification);
      expect(exam.max_tokens).toBe(900);
    }
    expect(exams[0].messages[1].content).toBe(common);
    expect(exams[0].messages[1].content).not.toContain("METHOD-MARKER");
    expect(exams[0].messages[1].content).not.toContain(material);
    expect(exams[1].messages[1].content).toContain(material);
    expect(exams[2].messages[1].content).toContain("METHOD-MARKER");
    expect(exams[3].messages[1].content).toContain("METHOD-MARKER");
    for (const teacher of calls.filter((c) => c.model === "teacher")) {
      expect(teacher.messages[1].content).toContain(specification);
      expect(teacher.messages[1].content).not.toContain(
        "Independent graduation task",
      );
    }
  } finally {
    await engine.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
