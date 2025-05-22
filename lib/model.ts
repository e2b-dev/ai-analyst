import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from "@ai-sdk/openai";
import { createFireworks } from "@ai-sdk/fireworks";
import { createOllama } from "ollama-ai-provider";

export type LLMModel = {
  id: string;
  name: string;
  provider: string;
  providerId: string;
};

export type LLMModelConfig = {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
};

export function getModelClient(model: LLMModel, config: LLMModelConfig) {
  const { id: modelNameString, providerId } = model;
  const { apiKey, baseURL } = config;

  const providerConfigs = {
    anthropic: () => createAnthropic({ apiKey, baseURL })(modelNameString),
    google: () =>
      createGoogleGenerativeAI({ apiKey, baseURL })(modelNameString),
    openai: () => createOpenAI()(modelNameString),
    ollama: () => createOllama({ baseURL })(modelNameString),
    fireworks: () =>
      createFireworks({
        apiKey: apiKey || process.env.FIREWORKS_API_KEY,
        baseURL: baseURL || "https://api.fireworks.ai/inference/v1",
      })(modelNameString),
  };

  const createClient =
    providerConfigs[providerId as keyof typeof providerConfigs];

  if (!createClient) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  return createClient();
}
