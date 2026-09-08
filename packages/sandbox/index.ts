import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { checks } from "../evaluation/course";
const exec = promisify(execFile);
export const IMAGE = "node:24-alpine";
export async function environment() {
  try {
    const { stdout } = await exec(
      "docker",
      ["version", "--format", "{{.Server.Version}}"],
      { timeout: 5000, maxBuffer: 10000 },
    );
    const imageInfo = await exec(
      "docker",
      ["image", "inspect", IMAGE, "--format", "{{.Id}}"],
      { timeout: 5000, maxBuffer: 10000 },
    )
      .then((r) => r.stdout.trim())
      .catch(() => null);
    return {
      docker: true,
      imageReady: !!imageInfo,
      digest: imageInfo,
      version: stdout.trim(),
      image: IMAGE,
      note:
        "Image must be explicitly pulled before first real course: docker pull " +
        IMAGE,
    };
  } catch {
    return {
      docker: false,
      version: null,
      image: IMAGE,
      note: "Docker daemon unavailable. Real execution is disabled; no host fallback.",
    };
  }
}
export async function evaluate(
  code: string,
  seed: number,
  signal: AbortSignal,
) {
  if (Buffer.byteLength(code) > 30000) throw new Error("Source exceeds 30 KB");
  signal.throwIfAborted();
  if (!(await environment()).docker)
    throw new Error(
      "Docker is unavailable. Real course refuses host execution.",
    );
  signal.throwIfAborted();
  const name = "apprentice-" + randomUUID();
  // Source and challenge inputs travel over stdin. No host directory is mounted.
  // Expected answers never enter the container; TypeScript is stripped INSIDE Docker.
  const runner = `import {stripTypeScriptTypes} from 'node:module';let s='';for await(const b of process.stdin)s+=b;const payload=JSON.parse(s);const js=stripTypeScriptTypes(payload.code);const {normalizeTags}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));const out=payload.inputs.map(x=>{try{return {value:normalizeTags(x)}}catch(e){return {error:e instanceof TypeError?'TypeError':'OtherError'}}});process.stdout.write(JSON.stringify(out));`;
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      const args = [
        "run",
        "--rm",
        "--pull=never",
        "--name",
        name,
        "--network=none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user=65534:65534",
        "--cpus=1",
        "--memory=128m",
        "--pids-limit=32",
        "--ulimit=nofile=64:64",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "-i",
        IMAGE,
        "node",
        "--disable-warning=ExperimentalWarning",
        "--input-type=module",
        "-e",
        runner,
      ];
      const child = spawn("docker", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          DOCKER_HOST: process.env.DOCKER_HOST,
        },
      });
      let stdout = "",
        stderr = "",
        finished = false;
      const timer = setTimeout(
        () => stop(new Error("Sandbox exceeded 15 seconds")),
        15000,
      );
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      };
      const stop = (e: Error) => {
        if (finished) return;
        finished = true;
        cleanup();
        child.kill("SIGKILL");
        exec("docker", ["rm", "-f", name], { timeout: 5000 })
          .catch(() => {})
          .finally(() => reject(e));
      };
      const abort = () => stop(new Error("Cancelled"));
      signal.addEventListener("abort", abort, { once: true });
      child.stdout.on("data", (b) => {
        stdout += b;
        if (stdout.length > 100000)
          stop(new Error("Sandbox output limit exceeded"));
      });
      child.stderr.on("data", (b) => {
        stderr += b;
        if (stderr.length > 10000)
          stop(new Error("Sandbox error output limit exceeded"));
      });
      child.on("error", stop);
      child.stdin.on("error", () => {});
      child.on("close", (status) => {
        if (finished) return;
        finished = true;
        cleanup();
        if (status !== 0)
          reject(new Error("Sandbox failed: " + stderr.slice(-1500)));
        else resolve(stdout);
      });
      child.stdin.end(
        JSON.stringify({ code, inputs: checks(seed).map((c) => c.input) }),
      );
      if (signal.aborted) abort();
    });
    const output = JSON.parse(raw);
    if (!Array.isArray(output) || output.length !== checks(seed).length)
      throw new Error("Sandbox returned invalid result count");
    return checks(seed).map((c, i) => ({
      name: c.name,
      passed: c.throws
        ? output[i]?.error === "TypeError"
        : JSON.stringify(output[i]?.value) === JSON.stringify(c.expected),
      detail: c.throws
        ? "Requires TypeError for invalid input"
        : "Output checked against independent expected value",
    }));
  } finally {
    await exec("docker", ["rm", "-f", name], { timeout: 5000 }).catch(() => {});
  }
}
export function simulatedEvaluation(improved: boolean) {
  return checks(0).map((c, i) => ({
    name: c.name,
    passed: improved || i === 5,
    detail: "SIMULATED fixture — code was NOT executed",
  }));
}
