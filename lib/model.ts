import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createFireworks } from "@ai-sdk/fireworks";
import { createOllama } from "ollama-ai-provider";
import {
  apiKeySchema,
  llmModelConfigSchema,
  llmModelSchema,
  type LLMModel,
  type LLMModelConfig,
} from "./model-config";
import modelsList from "./models.json";

const models = modelsList.models.map((model) => llmModelSchema.parse(model));

const providerSettings = {
  anthropic: {
    baseURL: "https://api.anthropic.com/v1",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  google: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    keyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    keyEnv: "OPENAI_API_KEY",
  },
  fireworks: {
    baseURL: "https://api.fireworks.ai/inference/v1",
    keyEnv: "FIREWORKS_API_KEY",
  },
} as const;

export class ProviderConfigurationError extends Error {
  constructor() {
    super("Model provider is not configured");
  }
}

function getOllamaBaseURL(): string | undefined {
  if (!process.env.OLLAMA_BASE_URL) return undefined;
  try {
    const url = new URL(process.env.OLLAMA_BASE_URL);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash
    ) {
      return undefined;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function getAvailableModels(): LLMModel[] {
  const ollamaEnabled = getOllamaBaseURL() !== undefined;
  return models.filter((model) => model.providerId !== "ollama" || ollamaEnabled);
}

export function resolveModel(id: unknown): LLMModel | undefined {
  return getAvailableModels().find((model) => model.id === id);
}

// Pin the initial destination and prevent redirects from leaving HTTPS or the
// approved origin. Resolve global fetch at call time so tests can intercept it.
function providerFetch(baseURL: string): typeof fetch {
  const origin = new URL(baseURL).origin;
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (
      url.protocol !== "https:" || url.origin !== origin ||
      url.username || url.password
    ) {
      throw new Error("Invalid provider destination");
    }
    return fetch(input, { ...init, redirect: "error" });
  };
}

export function getModelClient(requestedModel: LLMModel, config: LLMModelConfig) {
  const validatedConfig = llmModelConfigSchema.parse(config);
  const model = resolveModel(requestedModel.id);
  if (!model || model.providerId !== requestedModel.providerId) {
    throw new ProviderConfigurationError();
  }

  if (model.providerId === "ollama") {
    const baseURL = getOllamaBaseURL();
    if (!baseURL) throw new ProviderConfigurationError();
    return createOllama({ baseURL, fetch: providerFetch(baseURL) })(model.id);
  }

  const { baseURL, keyEnv } = providerSettings[model.providerId];
  // Absence selects server-funded mode. A supplied key selects BYOK, and can
  // never fall back to the environment, even if the provider rejects it.
  const mode = validatedConfig.apiKey === undefined ? "server" : "byok";
  const credential = apiKeySchema.safeParse(
    mode === "byok" ? validatedConfig.apiKey : process.env[keyEnv],
  );
  if (!credential.success) throw new ProviderConfigurationError();
  const options = {
    apiKey: credential.data,
    baseURL,
    fetch: providerFetch(baseURL),
  };

  switch (model.providerId) {
    case "anthropic":
      return createAnthropic(options)(model.id);
    case "google":
      return createGoogleGenerativeAI(options)(model.id);
    case "openai":
      return createOpenAI(options)(model.id);
    case "fireworks":
      return createFireworks(options)(model.id);
  }
}
