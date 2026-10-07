import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { generateText, APICallError } from "ai";
import {
  getModelClient,
  getModelSettings,
  modelConfigSchema,
} from "../lib/model.ts";
import { providerErrorMessage } from "../lib/api-error.ts";

const model = {
  id: "gpt-6-astra",
  providerId: "openai",
  provider: "OpenAI",
  name: "GPT-6 Astra",
};

test("OpenAI uses the supplied key and Responses URL without unsupported saved sampling settings", async () => {
  let request;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    request = {
      url: req.url,
      key: req.headers.authorization,
      body: JSON.parse(Buffer.concat(chunks)),
    };
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        id: "resp_test",
        object: "response",
        created_at: 1,
        status: "completed",
        model: model.id,
        output: [
          {
            type: "message",
            id: "msg_test",
            status: "completed",
            role: "assistant",
            content: [
              { type: "output_text", text: "verified", annotations: [] },
            ],
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      })
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const config = {
      apiKey: "test-key",
      baseURL: `http://127.0.0.1:${server.address().port}/v1`,
      temperature: 0,
      topP: 0.5,
      topK: 10,
      frequencyPenalty: 1,
      presencePenalty: 1,
      maxTokens: 1000,
    };
    const response = await generateText({
      model: getModelClient(model, config),
      messages: [
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "previous code",
              providerOptions: {
                openai: { itemId: "msg_previous", phase: "final_answer" },
              },
            },
          ],
        },
        { role: "user", content: "follow up" },
      ],
      ...getModelSettings(model, config),
    });
    assert.equal(response.text, "verified");
    assert.equal(request.url, "/v1/responses");
    assert.equal(request.key, "Bearer test-key");
    assert.equal(request.body.model, model.id);
    assert.equal(request.body.max_output_tokens, 1000);
    assert.equal(request.body.reasoning.effort, "low");
    assert.equal(request.body.store, false);
    assert.ok(!request.body.input.some((item) => item.type === "item_reference"));
    assert.ok(
      request.body.input.some(
        (item) => item.role === "assistant" && item.content === "previous code"
      )
    );
    for (const key of [
      "temperature",
      "top_p",
      "top_k",
      "frequency_penalty",
      "presence_penalty",
      "baseURL",
    ])
      assert.equal(request.body[key], undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("invalid settings are rejected while explicit zero is preserved", () => {
  assert.equal(modelConfigSchema.parse({ temperature: 0 }).temperature, 0);
  for (const config of [
    { temperature: 5 },
    { topP: -1 },
    { maxTokens: 1 },
    { maxTokens: 50.5 },
    { baseURL: "not-a-url" },
  ]) {
    assert.equal(modelConfigSchema.safeParse(config).success, false);
  }
});

test("provider errors are actionable without exposing upstream bodies", () => {
  for (const [statusCode, expected] of [
    [401, "API key"],
    [403, "API key"],
    [404, "unavailable"],
    [429, "limit"],
    [400, "settings"],
  ]) {
    const error = new APICallError({
      message: "private upstream details",
      url: "https://example.test",
      requestBodyValues: {},
      statusCode,
      responseBody: "secret",
    });
    const message = providerErrorMessage(error);
    assert.ok(message.includes(expected));
    assert.ok(!message.includes("secret"));
    assert.ok(!message.includes("private"));
  }
});

// A retired saved model must not send its credentials to another provider.
test("retired selections migrate within their provider and clear unsupported settings", async () => {
  const { migrateModelConfig } = await import("../lib/model-selection.ts");
  const models = [
    { ...model, providerId: "fireworks", id: "accounts/fireworks/models/new" },
    model,
  ];
  const migrated = migrateModelConfig(models, {
    model: "o3",
    apiKey: "openai-key",
    temperature: 5,
    baseURL: "https://example.test/v1",
  });
  assert.equal(migrated.model, model.id);
  assert.equal(migrated.apiKey, "openai-key");
  assert.equal(migrated.temperature, undefined);
  assert.equal(
    migrateModelConfig(models, { model: "unknown", apiKey: "private-key" })
      .apiKey,
    undefined
  );
});
