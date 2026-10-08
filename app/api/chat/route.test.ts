import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockProviders, modelFor, providers } from "@/test/provider-transport";
import { getRequestModelConfig, migrateStoredModelSettings } from "@/lib/model-config";
import { POST } from "./route";

const transport = mockProviders();

function bodyFor(provider: Parameters<typeof modelFor>[0] = "openai", config: object = {}) {
  const model = modelFor(provider);
  return {
    messages: [{ role: "user", content: "Plot the data" }],
    data: { files: [], model, config: { model: model.id, ...config } },
  };
}

async function post(body: unknown) {
  return POST(new Request("http://localhost/api/chat", {
    method: "POST", body: JSON.stringify(body),
  }));
}

async function expectRejected(body: unknown) {
  const response = await post(body);
  assert.equal(response.status, 400);
  assert.deepEqual(transport.requests, []);
}

describe("/api/chat request validation", () => {
  for (const provider of [...providers.map((entry) => entry.id), "ollama"] as const) {
    it(`${provider}: rejects every client-supplied destination before fetching`, async () => {
      process.env.OLLAMA_BASE_URL = "https://ollama.test/api";
      for (const baseURL of ["https://attacker.example/v1", "http://attacker.example", "http://127.0.0.1", "http://10.0.0.1", "http://169.254.169.254", "https://[::1]", null]) {
        for (const config of [{ baseURL }, { baseURL, apiKey: "client-key" }]) {
          await expectRejected(bodyFor(provider, config));
        }
      }
    });

    it(`${provider}: rejects blank and non-string API keys`, async () => {
      process.env.OLLAMA_BASE_URL = "https://ollama.test/api";
      for (const apiKey of ["", " ", "\t\n", null, false, 0, {}, []]) {
        await expectRejected(bodyFor(provider, { apiKey }));
      }
    });
  }

  it("rejects unknown fields throughout the request", async () => {
    const valid = bodyFor();
    const invalid = [
      { ...valid, extra: true },
      { ...valid, data: { ...valid.data, extra: true } },
      { ...valid, data: { ...valid.data, model: { ...valid.data.model, baseURL: "https://attacker.example" } } },
      { ...valid, messages: [{ ...valid.messages[0], extra: true }] },
      { ...valid, messages: [{ ...valid.messages[0], experimental_attachments: [{ url: "http://127.0.0.1" }] }] },
      { ...valid, data: { ...valid.data, files: [{ name: "test", contentType: "text/plain", content: "x", extra: true }] } },
      ...["headers", "maxRetries", "providerOptions", "modelId", "baseUrl"].map((key) => bodyFor("openai", { [key]: "forbidden" })),
    ];
    for (const body of invalid) await expectRejected(body);
  });

  it("rejects unknown IDs, unknown providers and mismatched model/provider pairs", async () => {
    const valid = bodyFor();
    for (const model of [
      { ...valid.data.model, id: "not-a-model" },
      { ...valid.data.model, providerId: "constructor" },
      { ...valid.data.model, providerId: "fireworks" },
    ]) await expectRejected({ ...valid, data: { ...valid.data, model } });
    await expectRejected(bodyFor("openai", { model: "another-model" }));
  });

  it("rejects malformed JSON and invalid nesting with a generic 400", async () => {
    const malformed = await POST(new Request("http://localhost/api/chat", { method: "POST", body: "{" }));
    assert.equal(malformed.status, 400);
    const valid = bodyFor();
    for (const body of [null, [], {}, { ...valid, messages: null }, { ...valid, messages: [] },
      { ...valid, data: { ...valid.data, config: null } },
      { ...valid, data: { ...valid.data, config: [] } },
      { ...valid, data: { ...valid.data, files: null } },
      { ...valid, data: { model: valid.data.model } },
    ]) await expectRejected(body);
    assert.deepEqual(transport.requests, []);
  });

  it("validates sampling parameter types and ranges", async () => {
    for (const config of [{ temperature: "1" }, { topP: 2 }, { topK: -1 }, { topK: 0.5 },
      { maxTokens: 0 }, { maxTokens: 1.5 }, { frequencyPenalty: 3 }, { presencePenalty: null }]) {
      await expectRejected(bodyFor("openai", config));
    }
  });
});

describe("/api/chat provider requests", () => {
  for (const provider of providers) {
    for (const mode of ["server", "byok"] as const) {
      it(`${provider.id}: streams successfully with the ${mode} credential`, async () => {
        const config = mode === "byok" ? { apiKey: "client-key" } : {};
        const response = await post(bodyFor(provider.id, config));
        assert.equal(response.status, 200);
        const text = await response.text();
        assert.ok(text.includes("Hello"), text);
        assert.equal(transport.requests.length, 1);
        const request = transport.requests[0];
        assert.equal(request.url.origin, `https://${provider.host}`);
        const key = mode === "byok" ? "client-key" : `server-${provider.id}`;
        assert.equal(request.headers.get(provider.header), provider.prefix + key);
        assert.equal(request.redirect, "error");
        assert.ok(!text.includes(key));
      });
    }

    it(`${provider.id}: reports a missing server key without fetching`, async () => {
      delete process.env[provider.env];
      const response = await post(bodyFor(provider.id));
      assert.equal(response.status, 503);
      assert.equal(await response.text(), "Model provider is not configured");
      assert.deepEqual(transport.requests, []);
    });

    it(`${provider.id}: a rejected BYOK key returns a generic error without fallback`, async () => {
      transport.rejectRequests = true;
      const response = await post(bodyFor(provider.id, { apiKey: "rejected-client-key" }));
      assert.equal(response.status, 500);
      assert.equal(await response.text(), "Unable to complete chat request");
      assert.equal(transport.requests.length, 1);
      assert.equal(transport.requests[0].headers.get(provider.header), provider.prefix + "rejected-client-key");
    });
  }

  it("accepts an actual follow-up payload and excludes sandbox results from the prompt", async () => {
    const valid = bodyFor();
    const response = await post({ ...valid, messages: [
      valid.messages[0],
      { role: "assistant", content: "Previous answer", toolInvocations: [{
        state: "result", toolCallId: "1", toolName: "runCode", args: "print(1)",
        result: { text: "sandbox-result-marker", results: [], logs: {}, error: null },
      }] },
      { role: "user", content: "Follow up" },
    ], data: { ...valid.data, files: [{ name: "data.csv", contentType: "text/csv", content: "x,y" }] } });
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("Hello"));
    assert.ok(transport.requests[0].body.includes("data.csv"));
    assert.ok(transport.requests[0].body.includes("Follow up"));
    assert.ok(!transport.requests[0].body.includes("sandbox-result-marker"));
  });

  for (const mode of ["server", "byok"] as const) {
    it(`uses only the explicitly chosen ${mode} credential after browser migration`, async () => {
      const settings = migrateStoredModelSettings({
        model: modelFor("fireworks").id, apiKey: "old-gateway-key", baseURL: "https://old-endpoint.test",
        headers: {}, temperature: 0.4, maxTokens: 100,
      });
      assert.equal(getRequestModelConfig(settings), undefined);
      assert.equal(transport.requests.length, 0);
      const config = getRequestModelConfig({
        ...settings,
        apiKey: mode === "byok" ? "new-fireworks-key" : undefined,
        needsCredentialReview: undefined,
      });
      assert.ok(config);
      const response = await post(bodyFor("fireworks", config));
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes("Hello"));
      assert.equal(transport.requests.length, 1);
      const request = transport.requests[0];
      assert.equal(request.url.origin, "https://api.fireworks.ai");
      assert.equal(request.headers.get("authorization"),
        `Bearer ${mode === "byok" ? "new-fireworks-key" : "server-fireworks"}`);
      assert.ok(!JSON.stringify([...request.headers]).includes("old-gateway-key"));
      const body = JSON.parse(request.body);
      assert.equal(body.temperature, 0.4);
      assert.equal(body.max_tokens, 100);
    });
  }

  it("streams the allowlisted Ollama model when its HTTPS endpoint is configured", async () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.test/api";
    const response = await post(bodyFor("ollama"));
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("Hello"));
    assert.equal(transport.requests[0].url.href, "https://ollama.test/api/chat");
    assert.equal(transport.requests[0].headers.get("authorization"), null);
  });

  it("rejects Ollama before fetching when its endpoint is absent or HTTP", async () => {
    await expectRejected(bodyFor("ollama"));
    process.env.OLLAMA_BASE_URL = "http://ollama.test/api";
    await expectRejected(bodyFor("ollama"));
  });
});
