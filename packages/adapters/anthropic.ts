import type { Provider } from "../protocol/index";
import {
  boundedJson,
  providerFetch,
  type Prompt,
  type Completion,
} from "./index";

export async function anthropic(
  provider: Provider,
  prompt: Prompt,
  signal: AbortSignal,
  key: string,
): Promise<Completion> {
  const base = provider.baseUrl!.replace(/\/+$/, "");
  const response = await providerFetch(
    base + (base.endsWith("/v1") ? "/messages" : "/v1/messages"),
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
        max_tokens: prompt.maxOutput,
        stream: false,
      }),
    },
  );
  let text = "",
    input: number | null = null,
    output: number | null = null;
  const usage = (u: any) => {
    if (Number.isFinite(u?.input_tokens) && u.input_tokens >= 0)
      input = u.input_tokens;
    if (Number.isFinite(u?.output_tokens) && u.output_tokens >= 0)
      output = u.output_tokens;
  };
  if (
    response.ok &&
    response.headers.get("content-type")?.includes("text/event-stream")
  ) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty provider response");
    const decoder = new TextDecoder();
    let buffer = "",
      bytes = 0,
      stopped = false;
    const event = (block: string) => {
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) return;
      let e: any;
      try {
        e = JSON.parse(data);
      } catch {
        throw new Error("Invalid Anthropic stream event");
      }
      if (!e || typeof e !== "object")
        throw new Error("Invalid Anthropic stream event");
      if (e.type === "error")
        throw new Error("Anthropic stream returned an error");
      if (e.type === "message_start") usage(e.message?.usage);
      if (e.type === "message_delta") usage(e.usage);
      if (e.type === "content_block_start" && e.content_block?.type === "text")
        text += e.content_block.text ?? "";
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta")
        text += e.delta.text ?? "";
      if (e.type === "message_stop") stopped = true;
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (value) {
          bytes += value.length;
          if (bytes > 1000000)
            throw new Error("Provider response exceeded 1 MB");
        }
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let at;
        while ((at = buffer.indexOf("\n\n")) !== -1) {
          event(buffer.slice(0, at));
          buffer = buffer.slice(at + 2);
        }
        if (done) {
          if (buffer.trim()) event(buffer);
          break;
        }
      }
      if (!stopped) throw new Error("Incomplete Anthropic stream");
    } finally {
      await reader.cancel().catch(() => {});
    }
  } else {
    const json = await boundedJson(response);
    if (json.type === "error") throw new Error("Anthropic returned an error");
    text = (json.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    usage(json.usage);
  }
  if (!text.trim()) throw new Error("Provider returned no usable text");
  return {
    text: text.split(key).join("[REDACTED]").slice(0, 30000),
    input,
    output,
    cost:
      input !== null &&
      output !== null &&
      provider.priceInput !== undefined &&
      provider.priceOutput !== undefined
        ? (input * provider.priceInput + output * provider.priceOutput) / 1e6
        : null,
  };
}
