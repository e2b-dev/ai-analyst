import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createFireworks } from "@ai-sdk/fireworks";
import { z } from "zod";

export type LLMModel = {
  id: string;
  name: string;
  provider: string;
  providerId: string;
};

export const modelConfigSchema = z.object({
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(0).max(500).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  maxTokens: z.number().int().min(50).max(32768).optional(),
});

export type LLMModelConfig = z.infer<typeof modelConfigSchema>;

export const providerKeyNames = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
} as const;

export function getModelClient(model: LLMModel, config: LLMModelConfig) {
  const apiKey =
    config.apiKey ||
    process.env[
      providerKeyNames[model.providerId as keyof typeof providerKeyNames]
    ];
  const options = { apiKey, baseURL: config.baseURL };

  switch (model.providerId) {
    case "anthropic":
      return createAnthropic(options)(model.id);
    case "google":
      return createGoogleGenerativeAI(options)(model.id);
    case "openai":
      return createOpenAI(options).responses(model.id);
    case "fireworks":
      return createFireworks(options)(model.id);
    default:
      throw new Error("Unsupported provider");
  }
}

export function getModelSettings(model: LLMModel, config: LLMModelConfig) {
  const common = { maxOutputTokens: config.maxTokens ?? 8192 };
  // GPT-6 reasoning models reject sampling parameters. Responses doesn't
  // support frequency/presence penalties or topK either.
  if (model.providerId === "openai") {
    return {
      ...common,
      // The UI retains code text, not reasoning items. Replay that text rather
      // than referencing stored response items with missing reasoning context.
      providerOptions: {
        openai: { reasoningEffort: "low" as const, store: false },
      },
    };
  }
  if (model.providerId === "anthropic") return common;
  return {
    ...common,
    temperature: config.temperature,
    topP: config.topP,
    ...(model.providerId === "google"
      ? { topK: config.topK }
      : {
          frequencyPenalty: config.frequencyPenalty,
          presencePenalty: config.presencePenalty,
        }),
  };
}
