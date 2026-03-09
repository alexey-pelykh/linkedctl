// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { refreshCommand } from "./refresh.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("auth refresh", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let saveOAuthTokensSpy: ReturnType<typeof vi.spyOn>;
  let saveOAuthClientCredentialsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    saveOAuthTokensSpy = vi.spyOn(core, "saveOAuthTokens").mockResolvedValue(undefined);
    saveOAuthClientCredentialsSpy = vi.spyOn(core, "saveOAuthClientCredentials").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes access token using stored refresh token", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "old-token",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
          "refresh-token": "existing-refresh-token",
          "token-expires-at": "2025-01-01T00:00:00.000Z",
        },
        "api-version": "202603",
      },
      path: "/some/path.yaml",
    });

    vi.spyOn(core, "refreshAccessToken").mockResolvedValue({
      accessToken: "refreshed-access-token",
      expiresIn: 5184000,
      refreshToken: "new-refresh-token",
      scope: "openid profile",
    });

    const cmd = refreshCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(saveOAuthTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "refreshed-access-token",
        refreshToken: "new-refresh-token",
      }),
      { profile: undefined },
    );
    expect(saveOAuthClientCredentialsSpy).toHaveBeenCalledWith(
      { clientId: "my-client-id", clientSecret: "my-client-secret" },
      { profile: undefined },
    );
    expect(consoleSpy).toHaveBeenCalledWith('Token refreshed for profile "default".');
  });

  it("keeps old refresh token when response omits it", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "old-token",
          "client-id": "cid",
          "client-secret": "csecret",
          "refresh-token": "original-refresh-token",
        },
        "api-version": "202603",
      },
      path: "/some/path.yaml",
    });

    vi.spyOn(core, "refreshAccessToken").mockResolvedValue({
      accessToken: "refreshed-token",
      expiresIn: 3600,
      scope: "openid",
    });

    const cmd = refreshCommand();
    await cmd.parseAsync([], { from: "user" });

    // When no new refresh token returned, the command passes the existing one
    expect(saveOAuthTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "refreshed-token",
        refreshToken: "original-refresh-token",
      }),
      { profile: undefined },
    );
  });

  it("throws when config is empty (no profile)", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: undefined,
      path: undefined,
    });

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/Missing OAuth2 credentials/);
  });

  it("throws when no refresh token is available", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "tok",
          "client-id": "cid",
          "client-secret": "csecret",
        },
        "api-version": "202603",
      },
      path: "/some/path.yaml",
    });

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(
      /No refresh token available.*Marketing Developer Platform/,
    );
  });

  it("throws when client credentials are missing", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "tok",
        },
        "api-version": "202603",
      },
      path: "/some/path.yaml",
    });

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/Missing OAuth2 credentials/);
  });

  it("wraps refresh failure with actionable message", async () => {
    vi.spyOn(core, "loadConfigFile").mockResolvedValue({
      raw: {
        oauth: {
          "access-token": "old-token",
          "client-id": "cid",
          "client-secret": "csecret",
          "refresh-token": "expired-refresh-token",
        },
        "api-version": "202603",
      },
      path: "/some/path.yaml",
    });

    vi.spyOn(core, "refreshAccessToken").mockRejectedValue(new Error("token expired"));

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(
      /Token refresh failed: token expired.*linkedctl auth login/,
    );
  });
});
