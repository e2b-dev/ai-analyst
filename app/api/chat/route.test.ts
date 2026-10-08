import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import modelsList from "@/lib/models.json";
import { POST } from "./route";

const originalFetch = globalThis.fetch;
let requestedHosts: string[] = [];

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.FIREWORKS_API_KEY = "test-key";
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

const openaiModel = modelsList.models.find((m) => m.providerId === "openai")!;

async function post(model: unknown, config: object) {
  const body = {
    messages: [{ id: "1", role: "user", content: "Plot the data" }],
    data: { files: [], model, config },
  };
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request).catch(() => undefined);
}

describe("/api/chat", () => {
  it("returns 400 for a model that is not in models.json", async () => {
    const response = await post(
      { id: "not-a-model", providerId: "openai" },
      {},
    );

    assert.equal(response?.status, 400);
    assert.deepEqual(requestedHosts, []);
  });

  it("uses the provider from models.json and ignores a client base URL", async () => {
    await post(
      { ...openaiModel, providerId: "fireworks" },
      { baseURL: "https://custom-endpoint.example/v1" },
    );

    assert.deepEqual(requestedHosts, ["api.openai.com"]);
  });
});
