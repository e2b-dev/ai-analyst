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
export type LLMModelSettings = LLMModelConfig & {
  needsCredentialReview?: boolean;
};

export function getModelParams(config: LLMModelConfig) {
  const {
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
  } = config;
  return {
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
  };
}

// A saved custom endpoint and its credential are a pair. Discard both and keep
// submissions paused across reloads until the user chooses new credentials.
export function migrateStoredModelSettings(value: unknown): LLMModelSettings {
  const stored = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const needsCredentialReview = Object.hasOwn(stored, "baseURL") ||
    stored.needsCredentialReview === true;
  const parsed = llmModelConfigSchema.strip().safeParse({
    ...stored,
    apiKey: needsCredentialReview ? undefined : stored.apiKey,
  });
  if (!parsed.success) return { needsCredentialReview: true };
  return {
    ...parsed.data,
    needsCredentialReview: needsCredentialReview || undefined,
  };
}

export function getRequestModelConfig(
  config: LLMModelSettings,
): LLMModelConfig | undefined {
  if (config.needsCredentialReview || Object.hasOwn(config, "baseURL")) {
    return undefined;
  }
  return { model: config.model, apiKey: config.apiKey, ...getModelParams(config) };
}
