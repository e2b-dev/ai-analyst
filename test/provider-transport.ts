import { afterEach, beforeEach } from "node:test";
import { llmModelSchema, type LLMModel } from "../lib/model-config";
import modelsList from "../lib/models.json";

export const providers = [
  { id: "anthropic", host: "api.anthropic.com", env: "ANTHROPIC_API_KEY", header: "x-api-key", prefix: "" },
  { id: "google", host: "generativelanguage.googleapis.com", env: "GOOGLE_GENERATIVE_AI_API_KEY", header: "x-goog-api-key", prefix: "" },
  { id: "openai", host: "api.openai.com", env: "OPENAI_API_KEY", header: "authorization", prefix: "Bearer " },
  { id: "fireworks", host: "api.fireworks.ai", env: "FIREWORKS_API_KEY", header: "authorization", prefix: "Bearer " },
] as const;

export function modelFor(providerId: LLMModel["providerId"]): LLMModel {
  return llmModelSchema.parse(modelsList.models.find((model) => model.providerId === providerId));
}

function streamResponse(host: string): Response {
  const sse = (events: unknown[]) => new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "content-type": "text/event-stream" } },
  );
  if (host === "api.anthropic.com") {
    return sse([
      { type: "message_start", message: { id: "test", usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 1 } },
      { type: "message_stop" },
    ]);
  }
  if (host === "generativelanguage.googleapis.com") {
    return sse([{ candidates: [{ content: { role: "model", parts: [{ text: "Hello" }] }, finishReason: "STOP" }] }]);
  }
  if (host === "ollama.test") {
    const events = [
      { model: "llama3.1", created_at: "2026-10-08T00:00:00Z", done: false, message: { role: "assistant", content: "Hello" } },
      { model: "llama3.1", created_at: "2026-10-08T00:00:00Z", done: true, eval_count: 1, eval_duration: 1, total_duration: 1 },
    ];
    return new Response(events.map((event) => JSON.stringify(event) + "\n").join(""), {
      headers: { "content-type": "application/x-ndjson" },
    });
  }
  if (host === "api.openai.com" || host === "api.fireworks.ai") {
    return sse([{ choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: "stop" }] }]);
  }
  throw new Error("Unexpected test destination");
}

export function mockProviders() {
  const state = {
    requests: [] as { url: URL; headers: Headers; body: string; redirect: RequestRedirect }[],
    rejectRequests: false,
  };
  const envNames = [...providers.map((provider) => provider.env), "OLLAMA_BASE_URL"];
  let savedEnv: (string | undefined)[];
  let savedFetch: typeof fetch;
  beforeEach(() => {
    savedEnv = envNames.map((name) => process.env[name]);
    savedFetch = globalThis.fetch;
    for (const provider of providers) process.env[provider.env] = `server-${provider.id}`;
    delete process.env.OLLAMA_BASE_URL;
    state.requests = [];
    state.rejectRequests = false;
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      state.requests.push({ url, headers: request.headers, body: await request.text(), redirect: request.redirect });
      if (state.rejectRequests) {
        return new Response(JSON.stringify({ error: { message: "Rejected dummy credential", type: "authentication_error", code: "invalid_api_key" } }), {
          status: 401, headers: { "content-type": "application/json" },
        });
      }
      return streamResponse(url.hostname);
    };
  });
  afterEach(() => {
    globalThis.fetch = savedFetch;
    envNames.forEach((name, index) => {
      if (savedEnv[index] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[index];
    });
  });
  return state;
}
