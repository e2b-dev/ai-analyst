import assert from "node:assert/strict";
import { it } from "node:test";
import {
  getRequestModelConfig,
  llmModelConfigSchema,
  migrateStoredModelSettings,
} from "./model-config";

const legacySettings = {
  model: "o3", apiKey: "gateway-key", temperature: 0.5, maxTokens: 100,
  baseURL: "https://old-gateway.example", headers: { authorization: "bad" }, maxRetries: 5,
};

it("removes a retired endpoint and its key together and pauses submission", () => {
  const settings = migrateStoredModelSettings(legacySettings);
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), {
    model: "o3", temperature: 0.5, maxTokens: 100, needsCredentialReview: true,
  });
  assert.equal(getRequestModelConfig(settings), undefined);
  assert.equal(getRequestModelConfig(legacySettings), undefined);
});

it("keeps submission paused across reloads without retaining the old key", () => {
  const stored = JSON.stringify(migrateStoredModelSettings(legacySettings));
  assert.ok(!stored.includes("gateway-key"));
  assert.ok(!stored.includes("old-gateway.example"));
  const reloaded = migrateStoredModelSettings(JSON.parse(stored));
  assert.equal(reloaded.needsCredentialReview, true);
  assert.equal(getRequestModelConfig(reloaded), undefined);
});

it("does not silently select server credentials when a retired endpoint has no key", () => {
  const settings = migrateStoredModelSettings({ ...legacySettings, apiKey: undefined });
  assert.equal(getRequestModelConfig(settings), undefined);
});

it("does not clear the pause when only model parameters change", () => {
  const settings = migrateStoredModelSettings(legacySettings);
  assert.equal(getRequestModelConfig({ ...settings, temperature: 1 }), undefined);
  assert.equal(getRequestModelConfig({ ...settings, model: "gpt-4o" }), undefined);
});

it("accepts a newly chosen provider key after credential review", () => {
  const settings = migrateStoredModelSettings(legacySettings);
  const config = getRequestModelConfig({
    ...settings, apiKey: "new-provider-key", needsCredentialReview: undefined,
  });
  assert.ok(config);
  assert.equal(config.apiKey, "new-provider-key");
  assert.ok(llmModelConfigSchema.safeParse(config).success);
});

it("accepts an explicit choice to use app credentials after credential review", () => {
  const settings = migrateStoredModelSettings(legacySettings);
  const config = getRequestModelConfig({ ...settings, needsCredentialReview: undefined });
  assert.ok(config);
  assert.equal(config.apiKey, undefined);
  assert.ok(llmModelConfigSchema.safeParse(config).success);
});

it("preserves ordinary settings and excludes obsolete SDK options", () => {
  const settings = migrateStoredModelSettings({
    model: "o3", apiKey: "client-key", temperature: 0.5, maxTokens: 100,
    headers: { authorization: "bad" }, maxRetries: 5,
  });
  const config = JSON.parse(JSON.stringify(getRequestModelConfig(settings)));
  assert.deepEqual(config, { model: "o3", apiKey: "client-key", temperature: 0.5, maxTokens: 100 });
  assert.ok(llmModelConfigSchema.safeParse(config).success);
});
