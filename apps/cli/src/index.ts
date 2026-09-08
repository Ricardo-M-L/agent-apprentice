import { Command as Program } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { Engine } from "../../../packages/core/index";
import { serve } from "../../../packages/core/server";
import {
  LearnSchema,
  redact,
  type Command,
} from "../../../packages/protocol/index";
const program = new Program()
  .name("apprentice")
  .description("Personal agents learn, practice, and graduate independently")
  .version("0.1.0")
  .option(
    "--data <path>",
    "Private coordinator directory",
    process.env.APPRENTICE_DATA ?? join(homedir(), ".agent-apprentice"),
  )
  .option("--url <url>", "Connect to an existing authenticated coordinator");
async function dispatch(command: Command) {
  const opts = program.opts();
  if (opts.url) {
    const u = new URL(opts.url);
    if (
      u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(u.hostname)
      )
    )
      throw new Error("HTTPS required except loopback");
    if (!process.env.APPRENTICE_API_TOKEN)
      throw new Error("APPRENTICE_API_TOKEN is required");
    const response = await fetch(opts.url.replace(/\/$/, "") + "/v1/command", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.APPRENTICE_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    const result = (await response.json()) as any;
    if (!response.ok) throw new Error(result.error ?? "API error");
    return result;
  }
  const engine = new Engine(opts.data);
  const stop = () => void engine.close().then(() => process.exit(130));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const result = await engine.dispatch(command);
    if (command.type === "learn") return await engine.wait(result.id);
    if (command.type === "compare")
      return await Promise.all(result.map((r: any) => engine.wait(r.id)));
    return result;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await engine.close();
  }
}
function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}
program
  .command("status")
  .action(async () => print(await dispatch({ type: "snapshot" })));
program
  .command("doctor")
  .action(async () => print(await dispatch({ type: "environment" })));
program
  .command("demo")
  .description("Run clearly labelled simulated teaching without a model key")
  .action(async () =>
    print(
      await dispatch({
        type: "learn",
        value: LearnSchema.parse({
          studentId: "demo-student",
          teacherId: "maintainer",
        }),
      }),
    ),
  );
program
  .command("learn")
  .requiredOption("--student <id>")
  .requiredOption("--teacher <id>")
  .option("--execution <mode>", "demo or docker", "demo")
  .option("--arm <arm>", "none/docs/static/teaching", "teaching")
  .option(
    "--consent",
    "Consent to sending course materials and generated attempts to configured providers",
    false,
  )
  .option("--max-tokens <n>", "Conservative token reservation budget", "16000")
  .option(
    "--capability <id>",
    "Retest an enabled capability without consulting the teacher",
  )
  .action(async (o) =>
    print(
      await dispatch({
        type: "learn",
        value: LearnSchema.parse({
          studentId: o.student,
          teacherId: o.teacher,
          arm: o.arm,
          execution: o.execution,
          consent: o.consent,
          maxTokens: Number(o.maxTokens),
          capabilityId: o.capability,
        }),
      }),
    ),
  );
program
  .command("compare")
  .option("--student <id>", "Student", "demo-student")
  .option("--teacher <id>", "Teacher", "maintainer")
  .option("--execution <mode>", "demo or docker", "demo")
  .option("--consent", "Consent to model transmission", false)
  .action(async (o) =>
    print(
      await dispatch({
        type: "compare",
        value: LearnSchema.parse({
          studentId: o.student,
          teacherId: o.teacher,
          execution: o.execution,
          consent: o.consent,
        }),
      }),
    ),
  );
program
  .command("configure")
  .argument("<json-file>")
  .description(
    "Save a provider.save or teacher.save JSON command; no keys in file",
  )
  .action(async (file) => {
    const input = JSON.parse(await readFile(file, "utf8"));
    if (!["provider.save", "teacher.save"].includes(input.type))
      throw new Error("Only configuration commands accepted");
    print(await dispatch(input));
  });
program
  .command("cancel")
  .argument("<session-id>")
  .action(async (id) => print(await dispatch({ type: "cancel", id })));
program
  .command("export")
  .argument("<capability-id>")
  .argument("<file>")
  .action(async (id, file) => {
    const text = await dispatch({ type: "capability.export", id });
    await writeFile(file, text, { flag: "wx", mode: 0o600 });
    console.log("Exported without credentials or raw transcripts.");
  });
program
  .command("import")
  .argument("<file>")
  .action(async (file) =>
    print(
      await dispatch({
        type: "capability.import",
        json: await readFile(file, "utf8"),
      }),
    ),
  );
program
  .command("enable")
  .argument("<id>")
  .action(async (id) =>
    print(await dispatch({ type: "capability.toggle", id, enabled: true })),
  );
program
  .command("disable")
  .argument("<id>")
  .action(async (id) =>
    print(await dispatch({ type: "capability.toggle", id, enabled: false })),
  );
program
  .command("serve")
  .option("--port <n>", "Loopback API port", "4318")
  .option(
    "--teacher-provider <id>",
    "Explicit provider for remote teacher protocol",
  )
  .option(
    "--teacher-token-env <name>",
    "Environment variable for a separate teaching-only token",
    "APPRENTICE_TEACHER_TOKEN",
  )
  .option(
    "--teacher-max-requests <n>",
    "Lifetime teaching call limit (1-100)",
    "100",
  )
  .option(
    "--teacher-max-concurrent <n>",
    "Concurrent teaching calls (1-2)",
    "2",
  )
  .option(
    "--teacher-max-reserved-tokens <n>",
    "Lifetime conservative byte/token reservation (max 1300000)",
    "1300000",
  )
  .action(async (o) => {
    if (!process.env.APPRENTICE_API_TOKEN)
      throw new Error(
        "Set APPRENTICE_API_TOKEN to a random value of at least 32 characters",
      );
    const engine = new Engine(program.opts().data);
    let server;
    try {
      server = await serve(
        engine,
        Number(o.port),
        process.env.APPRENTICE_API_TOKEN,
        o.teacherProvider,
        process.env[o.teacherTokenEnv],
        {
          maxRequests: Number(o.teacherMaxRequests),
          maxConcurrent: Number(o.teacherMaxConcurrent),
          maxReservedTokens: Number(o.teacherMaxReservedTokens),
        },
      );
    } catch (e) {
      await engine.close();
      throw e;
    }
    console.log(`Private authenticated API listening on 127.0.0.1:${o.port}`);
    const close = async () => {
      await server.close();
      await engine.close();
      process.exit(0);
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
program.parseAsync().catch((e) => {
  console.error(redact(e.message));
  process.exitCode = 1;
});
