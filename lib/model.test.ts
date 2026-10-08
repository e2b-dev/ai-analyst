import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateText, LanguageModelV1 } from "ai";
import {
  getModelClient,
  getModelParams,
  LLMModel,
  LLMModelConfig,
  resolveModel,
} from "./model";
import modelsList from "./models.json";

const customBaseURL = "https://custom-endpoint.example/v1";

const providerHosts: Record<string, string> = {
  anthropic: "api.anthropic.com",
  google: "generativelanguage.googleapis.com",
  openai: "api.openai.com",
  fireworks: "api.fireworks.ai",
};

const originalFetch = globalThis.fetch;
let requestedHosts: string[] = [];

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.FIREWORKS_API_KEY = "test-key";
  delete process.env.OLLAMA_BASE_URL;
  requestedHosts = [];
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    requestedHosts.push(new URL(url).host);
    throw new Error("network is disabled in tests");
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function firstModelOf(providerId: string) {
  const model = modelsList.models.find((m) => m.providerId === providerId);
  assert.ok(model, `models.json has no ${providerId} model`);
  return model;
}

async function sendPrompt(model: LanguageModelV1) {
  await generateText({ model, prompt: "Hello", maxRetries: 0 }).catch(
    () => {},
  );
}

describe("getModelClient", () => {
  for (const [providerId, host] of Object.entries(providerHosts)) {
    it(`sends ${providerId} requests to ${host}, ignoring a client base URL`, async () => {
      const config = { baseURL: customBaseURL } as LLMModelConfig;
      const client = getModelClient(firstModelOf(providerId), config);

      await sendPrompt(client as LanguageModelV1);

      assert.deepEqual(requestedHosts, [host]);
    });
  }

  it("sends ollama requests to OLLAMA_BASE_URL, ignoring a client base URL", async () => {
    process.env.OLLAMA_BASE_URL = "http://ollama.test:11434/api";
    const model: LLMModel = {
      id: "llama3.1",
      name: "Llama 3.1",
      provider: "Ollama",
      providerId: "ollama",
    };
    const config = { baseURL: customBaseURL } as LLMModelConfig;

    await sendPrompt(getModelClient(model, config) as LanguageModelV1);

    assert.deepEqual(requestedHosts, ["ollama.test:11434"]);
  });
});

describe("resolveModel", () => {
  it("returns the model from models.json", () => {
    const model = firstModelOf("openai");

    assert.deepEqual(resolveModel(model.id), model);
  });

  it("rejects IDs that are not in models.json", () => {
    for (const id of ["not-a-model", "constructor", undefined, 42]) {
      assert.equal(resolveModel(id), undefined);
    }
  });
});

describe("getModelParams", () => {
  it("keeps only the sampling parameters", () => {
    const config = {
      model: "o3",
      apiKey: "user-key",
      baseURL: customBaseURL,
      headers: { "X-Custom": "1" },
      maxRetries: 5,
      temperature: 0.5,
      maxTokens: 100,
    } as LLMModelConfig;

    assert.deepEqual(getModelParams(config), {
      temperature: 0.5,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      maxTokens: 100,
    });
  });
});
