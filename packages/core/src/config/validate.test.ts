// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { validateConfig, isValidProfileName } from "./validate.js";

describe("validateConfig", () => {
  it("returns empty config for undefined input", () => {
    const result = validateConfig(undefined);
    expect(result.config).toEqual({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("returns empty config for null input", () => {
    const result = validateConfig(null);
    expect(result.config).toEqual({});
    expect(result.errors).toEqual([]);
  });

  it("errors on array input", () => {
    const result = validateConfig([1, 2, 3]);
    expect(result.errors).toEqual([expect.stringContaining("array")]);
  });

  it("errors on string input", () => {
    const result = validateConfig("hello");
    expect(result.errors).toEqual([expect.stringContaining("string")]);
  });

  it("validates api-version as string", () => {
    const result = validateConfig({ "api-version": "202601" });
    expect(result.config.apiVersion).toBe("202601");
    expect(result.errors).toEqual([]);
  });

  it("errors when api-version is not a string", () => {
    const result = validateConfig({ "api-version": 202601 });
    expect(result.errors).toEqual([expect.stringContaining('"api-version" must be a string')]);
  });

  it("warns on unknown top-level keys", () => {
    const result = validateConfig({ "unknown-key": "value", "api-version": "202601" });
    expect(result.warnings).toEqual([expect.stringContaining('"unknown-key"')]);
    expect(result.config.apiVersion).toBe("202601");
  });

  it("validates oauth section with all fields", () => {
    const result = validateConfig({
      oauth: {
        "client-id": "cid",
        "client-secret": "csecret",
        "access-token": "tok",
        "refresh-token": "rtok",
        "token-expires-at": "2026-05-01T00:00:00Z",
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.config.oauth).toEqual({
      clientId: "cid",
      clientSecret: "csecret",
      accessToken: "tok",
      refreshToken: "rtok",
      tokenExpiresAt: "2026-05-01T00:00:00Z",
    });
  });

  it("validates oauth section with partial fields", () => {
    const result = validateConfig({
      oauth: { "access-token": "tok" },
    });

    expect(result.errors).toEqual([]);
    expect(result.config.oauth).toEqual({ accessToken: "tok" });
  });

  it("errors when oauth is not an object", () => {
    const result = validateConfig({ oauth: "bad" });
    expect(result.errors).toEqual([expect.stringContaining('"oauth" must be a mapping')]);
  });

  it("errors when oauth field has wrong type", () => {
    const result = validateConfig({
      oauth: { "access-token": 12345 },
    });
    expect(result.errors).toEqual([expect.stringContaining('"oauth.access-token" must be a string')]);
  });

  it("validates oauth scope as string", () => {
    const result = validateConfig({
      oauth: { scope: "openid profile email" },
    });
    expect(result.errors).toEqual([]);
    expect(result.config.oauth?.scope).toBe("openid profile email");
  });

  it("errors when oauth scope is not a string", () => {
    const result = validateConfig({
      oauth: { scope: 123 },
    });
    expect(result.errors).toEqual([expect.stringContaining('"oauth.scope" must be a string')]);
  });

  it("parses oauth pkce boolean", () => {
    const result = validateConfig({
      oauth: { pkce: true },
    });
    expect(result.errors).toEqual([]);
    expect(result.config.oauth?.pkce).toBe(true);
  });

  it("errors when oauth pkce is not a boolean", () => {
    const result = validateConfig({
      oauth: { pkce: "yes" },
    });
    expect(result.errors).toEqual([expect.stringContaining('"oauth.pkce" must be a boolean')]);
  });

  it("warns on unknown oauth keys", () => {
    const result = validateConfig({
      oauth: { "access-token": "tok", "unknown-field": "val" },
    });
    expect(result.warnings).toEqual([expect.stringContaining('"unknown-field"')]);
    expect(result.config.oauth?.accessToken).toBe("tok");
  });
});

describe("isValidProfileName", () => {
  it("accepts simple names", () => {
    expect(isValidProfileName("work")).toBe(true);
    expect(isValidProfileName("personal")).toBe(true);
    expect(isValidProfileName("my-profile")).toBe(true);
    expect(isValidProfileName("work_v2")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidProfileName("")).toBe(false);
  });

  it("rejects dot", () => {
    expect(isValidProfileName(".")).toBe(false);
  });

  it("rejects double dot", () => {
    expect(isValidProfileName("..")).toBe(false);
  });

  it("rejects names with forward slash", () => {
    expect(isValidProfileName("path/traversal")).toBe(false);
  });

  it("rejects names with backslash", () => {
    expect(isValidProfileName("path\\traversal")).toBe(false);
  });

  it("rejects names containing ..", () => {
    expect(isValidProfileName("a..b")).toBe(false);
  });

  it("rejects names with control characters", () => {
    expect(isValidProfileName("name\x00")).toBe(false);
    expect(isValidProfileName("name\n")).toBe(false);
  });
});
