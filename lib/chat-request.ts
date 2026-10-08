import { z } from "zod";
import { llmModelConfigSchema, llmModelSchema } from "./model-config";

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  // Completed sandbox results are display data, excluded from provider prompts.
  toolInvocations: z.array(z.object({
    state: z.literal("result"),
    toolCallId: z.string(),
    toolName: z.literal("runCode"),
    args: z.string(),
    result: z.unknown(),
  }).strict()).optional(),
}).strict();

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  data: z.object({
    files: z.array(z.object({
      name: z.string(),
      contentType: z.string(),
      content: z.string(),
    }).strict()),
    model: llmModelSchema,
    config: llmModelConfigSchema,
  }).strict(),
}).strict();
