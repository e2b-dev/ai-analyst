import type { LLMModel, LLMModelConfig } from "./model";

export function migrateModelConfig(
  models: LLMModel[],
  config: LLMModelConfig
): LLMModelConfig {
  if (models.some((model) => model.id === config.model)) return config;
  const provider = config.model?.startsWith("claude-")
    ? "anthropic"
    : config.model?.startsWith("models/gemini-")
      ? "google"
      : /^(gpt-|o[134])/.test(config.model ?? "")
        ? "openai"
        : config.model?.startsWith("accounts/fireworks/")
          ? "fireworks"
          : undefined;
  const replacement =
    models.find((model) => model.providerId === provider) ?? models[0];
  // Preserve credentials only when the retired model's provider is known.
  return provider
    ? {
        model: replacement.id,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        maxTokens: config.maxTokens,
      }
    : { model: replacement.id };
}
