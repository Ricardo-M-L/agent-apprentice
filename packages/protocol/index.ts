import { z } from "zod";
export const VERSION = "1.0" as const;
export const Identifier = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/);
export const EnvName = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/);
export const ProviderSchema = z
  .object({
    id: Identifier,
    name: z.string().min(1).max(100),
    kind: z.enum(["demo", "chat", "responses", "remote-teacher", "metis"]),
    model: z.string().min(1).max(150),
    baseUrl: z.string().url().max(1000).optional(),
    keyEnv: EnvName.optional(),
    priceInput: z.number().nonnegative().optional(),
    priceOutput: z.number().nonnegative().optional(),
  })
  .strict();
export type Provider = z.infer<typeof ProviderSchema>;
export const TeacherSchema = z
  .object({
    id: Identifier,
    name: z.string().min(1).max(100),
    providerId: Identifier,
    description: z.string().max(4000),
    license: z.string().min(1).max(100),
    material: z.string().max(20000),
    scope: z.string().max(1000),
  })
  .strict();
export type Teacher = z.infer<typeof TeacherSchema>;
export const Arms = ["none", "docs", "static", "teaching"] as const;
export type Arm = (typeof Arms)[number];
export const LearnSchema = z
  .object({
    studentId: Identifier,
    teacherId: Identifier,
    arm: z.enum(Arms).default("teaching"),
    rounds: z.number().int().min(1).max(4).default(2),
    maxTokens: z.number().int().min(100).max(100000).default(16000),
    maxCalls: z.number().int().min(1).max(40).default(12),
    timeoutSeconds: z.number().int().min(5).max(1800).default(180),
    execution: z.enum(["demo", "docker"]).default("demo"),
    consent: z.boolean().default(false),
    seed: z.number().int().min(0).max(999999).default(42),
    capabilityId: Identifier.optional(),
  })
  .strict();
export type LearnOptions = z.infer<typeof LearnSchema>;
export const CapabilityBody = z
  .object({
    version: z.literal(VERSION),
    id: Identifier,
    title: z.string().min(1).max(150),
    method: z.string().max(30000),
    source: z.object({
      teacher: z.string().max(100),
      license: z.string().max(100),
      session: Identifier,
    }),
    conditions: z.object({
      model: z.string(),
      provider: z.string(),
      course: z.string(),
      runtime: z.string(),
      execution: z.enum(["demo", "docker"]),
    }),
    verified: z.boolean(),
    simulated: z.boolean(),
    enabled: z.boolean(),
    createdAt: z.string().datetime(),
    results: z
      .array(
        z.object({ name: z.string(), passed: z.boolean(), detail: z.string() }),
      )
      .max(100),
  })
  .strict();
export const CapabilitySchema = CapabilityBody.extend({
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type Capability = z.infer<typeof CapabilitySchema>;
export interface Usage {
  input: number | null;
  output: number | null;
  cost: number | null;
  calls: number;
}
export interface Event {
  id: number;
  sessionId: string;
  at: string;
  kind: string;
  message: string;
  data?: unknown;
}
export interface Session {
  id: string;
  options: LearnOptions;
  status:
    "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
  phase: string;
  createdAt: string;
  endedAt?: string;
  error?: string;
  usage: Usage;
  results: Array<{ name: string; passed: boolean; detail: string }>;
  capabilityId?: string;
  simulated: boolean;
  durationMs?: number;
}
export const CommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot") }).strict(),
  z
    .object({ type: z.literal("provider.save"), value: ProviderSchema })
    .strict(),
  z.object({ type: z.literal("teacher.save"), value: TeacherSchema }).strict(),
  z.object({ type: z.literal("learn"), value: LearnSchema }).strict(),
  z.object({ type: z.literal("compare"), value: LearnSchema }).strict(),
  z.object({ type: z.literal("cancel"), id: Identifier }).strict(),
  z.object({ type: z.literal("capability.export"), id: Identifier }).strict(),
  z
    .object({
      type: z.literal("capability.import"),
      json: z.string().max(200000),
    })
    .strict(),
  z
    .object({
      type: z.literal("capability.toggle"),
      id: Identifier,
      enabled: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal("capability.delete"), id: Identifier }).strict(),
  z.object({ type: z.literal("events"), id: Identifier }).strict(),
  z.object({ type: z.literal("environment") }).strict(),
]);
export type Command = z.infer<typeof CommandSchema>;
export interface Snapshot {
  providers: Provider[];
  teachers: Teacher[];
  sessions: Session[];
  capabilities: Capability[];
}
export const TeachRequestSchema = z
  .object({
    version: z.literal(VERSION),
    material: z.string().max(20000),
    studentAttempt: z.string().max(12000),
    feedback: z.string().max(8000),
    task: z.string().max(8000),
  })
  .strict();
export function redact(text: string) {
  return text.replace(/(?:sk-[\w-]{8,}|Bearer\s+[\w.-]{8,})/gi, "[REDACTED]");
}
