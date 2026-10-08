import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { streamText, type LanguageModelV1 } from "ai";
import { getAvailableModels, getModelClient, ProviderConfigurationError, resolveModel } from "./model";
import type { LLMModel, LLMModelConfig } from "./model-config";
import { mockProviders, modelFor, providers } from "../test/provider-transport";

const transport = mockProviders();

async function sendPrompt(model: LLMModel, config: LLMModelConfig = {}) {
  const result = await streamText({
    model: getModelClient(model, config) as LanguageModelV1,
    prompt: "Hello", maxRetries: 0,
  });
  let text = "";
  for await (const delta of result.textStream) text += delta;
  return text;
}

describe("provider credentials and destinations", () => {
  for (const provider of providers) {
    for (const mode of ["server", "byok"] as const) {
      it(`${provider.id}: ${mode} mode sends only the selected credential to HTTPS`, async () => {
        const config = mode === "byok" ? { apiKey: "client-key" } : {};
        assert.equal(await sendPrompt(modelFor(provider.id), config), "Hello");
        assert.equal(transport.requests.length, 1);
        const request = transport.requests[0];
        const key = mode === "byok" ? "client-key" : `server-${provider.id}`;
        assert.equal(request.url.protocol, "https:");
        assert.equal(request.url.host, provider.host);
        assert.equal(request.headers.get(provider.header), provider.prefix + key);
        assert.equal(request.redirect, "error");
        assert.ok(!request.url.href.includes(key));
        assert.ok(!request.body.includes(key));
      });
    }

    it(`${provider.id}: BYOK works without an environment credential`, async () => {
      delete process.env[provider.env];
      assert.equal(await sendPrompt(modelFor(provider.id), { apiKey: "client-key" }), "Hello");
      assert.equal(transport.requests[0].headers.get(provider.header), provider.prefix + "client-key");
    });

    it(`${provider.id}: a missing server key fails before SDK construction`, () => {
      delete process.env[provider.env];
      assert.throws(() => getModelClient(modelFor(provider.id), {}), ProviderConfigurationError);
      assert.deepEqual(transport.requests, []);
    });

    it(`${provider.id}: invalid supplied keys cannot select server credentials`, () => {
      for (const apiKey of ["", " ", "\t\n", null, false, 0, {}, []]) {
        assert.throws(() => getModelClient(modelFor(provider.id), { apiKey } as LLMModelConfig));
      }
      assert.deepEqual(transport.requests, []);
    });

    it(`${provider.id}: direct callers cannot supply endpoint overrides`, () => {
      assert.throws(() => getModelClient(modelFor(provider.id), { baseURL: "https://attacker.example" } as LLMModelConfig));
      assert.deepEqual(transport.requests, []);
    });
  }

  it("a rejected BYOK key never triggers an OpenAI environment fallback", async () => {
    transport.rejectRequests = true;
    await assert.rejects(sendPrompt(modelFor("openai"), { apiKey: "rejected-client-key" }));
    assert.equal(transport.requests.length, 1);
    assert.equal(transport.requests[0].headers.get("authorization"), "Bearer rejected-client-key");
  });
});

describe("Ollama allowlist and configuration", () => {
  it("enables and streams an allowlisted Ollama model over HTTPS", async () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.test/api";
    const model = modelFor("ollama");
    assert.deepEqual(resolveModel(model.id), model);
    assert.ok(getAvailableModels().some((entry) => entry.id === model.id));
    assert.equal(await sendPrompt(model), "Hello");
    assert.equal(transport.requests[0].url.href, "https://ollama.test/api/chat");
    assert.equal(transport.requests[0].headers.get("authorization"), null);
    assert.equal(transport.requests[0].redirect, "error");
  });

  for (const endpoint of [undefined, "", "not a URL", "http://ollama.test/api", "https://user:key@ollama.test/api", "https://ollama.test/api?key=secret", "https://ollama.test/api#fragment"]) {
    it(`disables Ollama for ${String(endpoint)}`, () => {
      if (endpoint !== undefined) process.env.OLLAMA_BASE_URL = endpoint;
      assert.equal(resolveModel("llama3.1"), undefined);
      assert.ok(getAvailableModels().every((model) => model.providerId !== "ollama"));
      assert.throws(() => getModelClient(modelFor("ollama"), {}), ProviderConfigurationError);
      assert.deepEqual(transport.requests, []);
    });
  }

  it("rejects unknown model IDs even when Ollama is configured", () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.test/api";
    for (const id of ["unapproved-model", "constructor", undefined, 42]) {
      assert.equal(resolveModel(id), undefined);
    }
  });
});
