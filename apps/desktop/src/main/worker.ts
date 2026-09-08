import { Engine } from "../../../../packages/core/index";
import { serve } from "../../../../packages/core/server";
import { redact } from "../../../../packages/protocol/index";
const parent = (process as any).parentPort;
const engine = new Engine(process.env.APPRENTICE_DATA!);
let server: Awaited<ReturnType<typeof serve>> | undefined;
const send = (value: unknown) =>
  parent ? parent.postMessage(value) : process.send?.(value);
engine.on("event", (event) => send({ event }));
engine.on("updated", () => send({ refresh: true }));
async function receive(message: any) {
  const { id, command } = message;
  try {
    if (command?.type === "shutdown") {
      await server?.close();
      await engine.close();
      send({ id, result: true });
      process.exit(0);
    }
    const result = await engine.dispatch(command);
    send({ id, result });
  } catch (e) {
    send({ id, error: redact((e as Error).message) });
  }
}
if (parent) parent.on("message", (e: any) => void receive(e.data));
else process.on("message", (m) => void receive(m));
if (process.env.APPRENTICE_API_TOKEN) {
  serve(
    engine,
    Number(process.env.APPRENTICE_API_PORT ?? "4318"),
    process.env.APPRENTICE_API_TOKEN,
    process.env.APPRENTICE_TEACHER_PROVIDER,
  )
    .then((s) => {
      server = s;
      send({ ready: true });
    })
    .catch((e) => {
      send({ fatal: redact(e.message) });
      void engine.close().then(() => process.exit(1));
    });
} else send({ ready: true });
