import { ProviderSchema, type Provider } from "../protocol/index";
import { anthropic } from "./anthropic";
import { referenceCode, weakCode } from "../evaluation/course";
export async function providerFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error("Provider request failed or cancelled");
  }
}
export interface Completion {
  text: string;
  input: number | null;
  output: number | null;
  cost: number | null;
}
export interface Prompt {
  system: string;
  user: string;
  purpose: "teacher" | "student";
  maxOutput: number;
  demoImproved?: boolean;
}
export function validateEndpoint(provider: Provider) {
  ProviderSchema.parse(provider);
  if (provider.kind === "demo" || provider.kind === "metis") return;
  if (!provider.baseUrl) throw new Error("Provider endpoint required");
  const u = new URL(provider.baseUrl);
  if (u.username || u.password || u.search || u.hash)
    throw new Error("Endpoint must not contain credentials, query or fragment");
  if (
    u.protocol !== "https:" &&
    !(
      u.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)
    )
  )
    throw new Error("HTTPS required except for explicit loopback providers");
}
export async function boundedJson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty provider response");
  let raw = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1000000) throw new Error("Provider response exceeded 1 MB");
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Provider returned invalid JSON");
  }
}
export type KeyResolver = (provider: Provider) => Promise<string>;
export async function resolveKey(provider: Provider, resolver?: KeyResolver) {
  if (provider.credentialRef) {
    if (!resolver)
      throw new Error(
        "Saved credentials require the desktop secure store. Use an environment variable in CLI mode.",
      );
    return resolver(provider);
  }
  const key = provider.keyEnv ? process.env[provider.keyEnv] : undefined;
  if (!key)
    throw new Error(
      "Missing explicitly configured API key environment variable. Existing login files are never read.",
    );
  return key;
}
export async function complete(
  provider: Provider,
  prompt: Prompt,
  signal: AbortSignal,
  resolver?: KeyResolver,
): Promise<Completion> {
  validateEndpoint(provider);
  signal.throwIfAborted();
  if (provider.kind === "metis")
    throw new Error(
      "Metis adapter is disabled until isolated CLI execution is independently verified. No host execution fallback.",
    );
  if (provider.kind === "remote-teacher")
    throw new Error(
      "Remote teachers only support the teaching protocol, not student inference.",
    );
  if (provider.kind === "demo") {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(t);
        reject(new Error("Cancelled"));
      };
      const t = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, 120);
      signal.addEventListener("abort", abort, { once: true });
    });
    return {
      text:
        prompt.purpose === "teacher"
          ? "Validate the entire array before mapping. Reject non-strings with TypeError. Normalize with trim and lowercase; filter empty results; preserve insertion order using Set."
          : prompt.demoImproved
            ? referenceCode()
            : weakCode(),
      input: 40,
      output: 70,
      cost: 0,
    };
  }
  const key = await resolveKey(provider, resolver);
  if (provider.kind === "anthropic")
    return anthropic(provider, prompt, signal, key);
  const base = provider.baseUrl!.replace(/\/$/, "");
  let body: unknown;
  let endpoint: string;
  if (provider.kind === "chat") {
    endpoint = base + "/chat/completions";
    body = {
      model: provider.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: prompt.maxOutput,
      stream: false,
    };
  } else {
    endpoint = base + "/responses";
    body = {
      model: provider.model,
      instructions: prompt.system,
      input: prompt.user,
      max_output_tokens: prompt.maxOutput,
      store: false,
      stream: false,
    };
  }
  const res = await providerFetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
    redirect: "error",
  });
  const json = await boundedJson(res);
  const text =
    provider.kind === "chat"
      ? json.choices?.[0]?.message?.content
      : (json.output_text ??
        json.output
          ?.flatMap((o: any) => o.content ?? [])
          .filter((c: any) => c.type === "output_text")
          .map((c: any) => c.text)
          .join("\n"));
  if (typeof text !== "string" || !text.trim())
    throw new Error("Provider returned no usable text");
  const i =
    provider.kind === "chat"
      ? json.usage?.prompt_tokens
      : json.usage?.input_tokens;
  const o =
    provider.kind === "chat"
      ? json.usage?.completion_tokens
      : json.usage?.output_tokens;
  const input = typeof i === "number" && i >= 0 ? i : null,
    output = typeof o === "number" && o >= 0 ? o : null;
  const cost =
    input !== null &&
    output !== null &&
    provider.priceInput !== undefined &&
    provider.priceOutput !== undefined
      ? (input * provider.priceInput + output * provider.priceOutput) / 1e6
      : null;
  return {
    text: text.split(key).join("[REDACTED]").slice(0, 30000),
    input,
    output,
    cost,
  };
}
export async function remoteTeach(
  provider: Provider,
  payload: unknown,
  signal: AbortSignal,
  resolver?: KeyResolver,
): Promise<Completion> {
  validateEndpoint(provider);
  const key = await resolveKey(provider, resolver);
  const json = await boundedJson(
    await providerFetch(provider.baseUrl!.replace(/\/$/, "") + "/v1/teach", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
      redirect: "error",
    }),
  );
  if (
    json.version !== "1.0" ||
    json.simulated !== false ||
    typeof json.guidance !== "string" ||
    json.guidance.length > 30000
  )
    throw new Error("Invalid remote teacher protocol response");
  return {
    text: json.guidance.split(key).join("[REDACTED]"),
    input: null,
    output: null,
    cost: null,
  };
}
export function sourceOnly(text: string) {
  const match = text.match(
    /```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/,
  );
  return (match ? match[1] : text).trim();
}
