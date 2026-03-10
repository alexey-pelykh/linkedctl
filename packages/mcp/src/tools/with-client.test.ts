// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";

vi.mock("@linkedctl/core", () => ({
  resolveConfig: vi.fn(),
  LinkedInClient: vi.fn(),
  LinkedInAuthError: class LinkedInAuthError extends Error {
    public readonly status = 401;
    constructor(message: string) {
      super(message);
      this.name = "LinkedInAuthError";
    }
  },
}));

import { resolveConfig, LinkedInClient, LinkedInAuthError } from "@linkedctl/core";
import { withClient } from "./with-client.js";

describe("withClient", () => {
  it("resolves config and passes client to callback", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202401",
      },
      warnings: [],
    });
    vi.mocked(LinkedInClient).mockImplementation(function () {
      return Object.create(null);
    } as unknown as typeof LinkedInClient);

    const result = await withClient({ profile: "work", requiredScopes: ["openid", "profile"] }, async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    expect(resolveConfig).toHaveBeenCalledWith({
      profile: "work",
      requiredScopes: ["openid", "profile"],
    });
    expect(LinkedInClient).toHaveBeenCalledWith({
      accessToken: "test-token",
      apiVersion: "202401",
    });
    expect(result).toEqual({
      content: [{ type: "text", text: "ok" }],
    });
  });

  it("catches LinkedInAuthError and returns error with re-auth guidance", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "expired-token" },
        apiVersion: "202401",
      },
      warnings: [],
    });
    vi.mocked(LinkedInClient).mockImplementation(function () {
      return Object.create(null);
    } as unknown as typeof LinkedInClient);

    const result = await withClient({ requiredScopes: ["openid"] }, async () => {
      throw new LinkedInAuthError("HTTP 401: Unauthorized");
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
      },
    ]);
    expect(result.content[0]?.text).toContain("Authentication failed: HTTP 401: Unauthorized");
  });

  it("re-throws non-auth errors", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202401",
      },
      warnings: [],
    });
    vi.mocked(LinkedInClient).mockImplementation(function () {
      return Object.create(null);
    } as unknown as typeof LinkedInClient);

    await expect(
      withClient({ requiredScopes: ["openid"] }, async () => {
        throw new Error("Network failure");
      }),
    ).rejects.toThrow("Network failure");
  });

  it("handles undefined profile with exactOptionalPropertyTypes", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202401",
      },
      warnings: [],
    });
    vi.mocked(LinkedInClient).mockImplementation(function () {
      return Object.create(null);
    } as unknown as typeof LinkedInClient);

    const result = await withClient({ profile: undefined, requiredScopes: ["openid"] }, async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    expect(resolveConfig).toHaveBeenCalledWith({
      profile: undefined,
      requiredScopes: ["openid"],
    });
    expect(result.content).toEqual([{ type: "text", text: "ok" }]);
  });
});
