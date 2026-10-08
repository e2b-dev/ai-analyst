import { z } from "zod";

export const providerIdSchema = z.enum([
  "anthropic",
  "google",
  "openai",
  "fireworks",
  "ollama",
]);

export const llmModelSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  provider: z.string(),
  providerId: providerIdSchema,
}).strict();

export const apiKeySchema = z.string().trim().min(1).regex(/^\S+$/);

export const llmModelConfigSchema = z.object({
  model: z.string().min(1).optional(),
  apiKey: apiKeySchema.optional(),
  temperature: z.number().finite().min(0).max(5).optional(),
  topP: z.number().finite().min(0).max(1).optional(),
  topK: z.number().int().nonnegative().optional(),
  frequencyPenalty: z.number().finite().min(-2).max(2).optional(),
  presencePenalty: z.number().finite().min(-2).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
}).strict();

export type LLMModel = z.infer<typeof llmModelSchema>;
export type LLMModelConfig = z.infer<typeof llmModelConfigSchema>;

export function getModelParams(config: LLMModelConfig) {
  const {
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
  } = config;
  return {
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
  };
}

// Older localStorage entries may still contain baseURL or other retired fields.
export function getRequestModelConfig(config: LLMModelConfig): LLMModelConfig {
  return { model: config.model, apiKey: config.apiKey, ...getModelParams(config) };
}
