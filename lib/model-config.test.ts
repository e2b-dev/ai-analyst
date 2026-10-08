import assert from "node:assert/strict";
import { it } from "node:test";
import { getRequestModelConfig, llmModelConfigSchema } from "./model-config";

it("migrates stored settings without forwarding obsolete URLs or SDK options", () => {
  const saved = JSON.parse(JSON.stringify({
    model: "o3", apiKey: "client-key", temperature: 0.5, maxTokens: 100,
    baseURL: "https://attacker.example", headers: { authorization: "bad" }, maxRetries: 5,
  }));
  const config = JSON.parse(JSON.stringify(getRequestModelConfig(saved)));
  assert.deepEqual(config, { model: "o3", apiKey: "client-key", temperature: 0.5, maxTokens: 100 });
  assert.ok(llmModelConfigSchema.safeParse(config).success);
});
