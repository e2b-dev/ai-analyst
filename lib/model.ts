import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from "@ai-sdk/openai";
import { createFireworks } from "@ai-sdk/fireworks";
import { createOllama } from "ollama-ai-provider";
import modelsList from "./models.json";

export type LLMModel = {
  id: string;
  name: string;
  provider: string;
  providerId: string;
};

export type LLMModelConfig = {
  model?: string;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
};

// Finds the model in models.json. Ollama models are only available when
// OLLAMA_BASE_URL is set.
export function resolveModel(id: unknown): LLMModel | undefined {
  const model = modelsList.models.find((model) => model.id === id);
  if (model?.providerId === "ollama" && !process.env.OLLAMA_BASE_URL) {
    return undefined;
  }
  return model;
}

export function getModelParams(config: LLMModelConfig) {
  const {
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    maxTokens,
  } = config;
  return {
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    maxTokens,
  };
}

export function getModelClient(model: LLMModel, config: LLMModelConfig) {
  const { id: modelNameString, providerId } = model;
  const { apiKey } = config;

  const providerConfigs = {
    anthropic: () => createAnthropic({ apiKey })(modelNameString),
    google: () => createGoogleGenerativeAI({ apiKey })(modelNameString),
    openai: () => createOpenAI()(modelNameString),
    ollama: () =>
      createOllama({ baseURL: process.env.OLLAMA_BASE_URL })(modelNameString),
    fireworks: () =>
      createFireworks({
        apiKey: apiKey || process.env.FIREWORKS_API_KEY,
        baseURL: "https://api.fireworks.ai/inference/v1",
      })(modelNameString),
  };

  const createClient =
    providerConfigs[providerId as keyof typeof providerConfigs];

  if (!createClient) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  return createClient();
}
