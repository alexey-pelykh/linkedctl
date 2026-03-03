// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile, setProfile, setDefaultProfile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import * as oauth2 from "@linkedctl/core";
import { refreshCommand } from "./refresh.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("auth refresh", () => {
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    configPath = tempConfigPath();
    vi.spyOn(configFile, "getDefaultConfigPath").mockReturnValue(configPath);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(configPath, ".."), { recursive: true, force: true });
  });

  it("refreshes access token using stored refresh token", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "old-token",
          "api-version": "202501",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
          "refresh-token": "existing-refresh-token",
          "token-expiry": "2025-01-01T00:00:00.000Z",
        }),
        "default",
      ),
    );

    vi.spyOn(oauth2, "refreshAccessToken").mockResolvedValue({
      accessToken: "refreshed-access-token",
      expiresIn: 5184000,
      refreshToken: "new-refresh-token",
      scope: "openid profile",
    });

    const cmd = refreshCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    const profile = config.profiles?.["default"];
    expect(profile?.["access-token"]).toBe("refreshed-access-token");
    expect(profile?.["refresh-token"]).toBe("new-refresh-token");
    expect(profile?.["token-expiry"]).toBeDefined();
    expect(profile?.["client-id"]).toBe("my-client-id");
    expect(profile?.["client-secret"]).toBe("my-client-secret");
    expect(consoleSpy).toHaveBeenCalledWith('Token refreshed for profile "default".');
  });

  it("keeps old refresh token when response omits it", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "old-token",
          "api-version": "202501",
          "client-id": "cid",
          "client-secret": "csecret",
          "refresh-token": "original-refresh-token",
        }),
        "default",
      ),
    );

    vi.spyOn(oauth2, "refreshAccessToken").mockResolvedValue({
      accessToken: "refreshed-token",
      expiresIn: 3600,
      scope: "openid",
    });

    const cmd = refreshCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["default"]?.["refresh-token"]).toBe("original-refresh-token");
  });

  it("throws when profile does not exist", async () => {
    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("throws when no refresh token is available", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "tok",
          "api-version": "202501",
          "client-id": "cid",
          "client-secret": "csecret",
        }),
        "default",
      ),
    );

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(
      /No refresh token available.*Marketing Developer Platform/,
    );
  });

  it("throws when client credentials are missing", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "tok",
          "api-version": "202501",
        }),
        "default",
      ),
    );

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/Missing OAuth2 credentials/);
  });

  it("wraps refresh failure with actionable message", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "old-token",
          "api-version": "202501",
          "client-id": "cid",
          "client-secret": "csecret",
          "refresh-token": "expired-refresh-token",
        }),
        "default",
      ),
    );

    vi.spyOn(oauth2, "refreshAccessToken").mockRejectedValue(new Error("token expired"));

    const cmd = refreshCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(
      /Token refresh failed: token expired.*linkedctl auth login/,
    );
  });

  it("preserves api-version from existing profile", async () => {
    await writeConfigFile(
      configPath,
      setDefaultProfile(
        setProfile({}, "default", {
          "access-token": "old-token",
          "api-version": "202412",
          "client-id": "cid",
          "client-secret": "csecret",
          "refresh-token": "rt",
        }),
        "default",
      ),
    );

    vi.spyOn(oauth2, "refreshAccessToken").mockResolvedValue({
      accessToken: "new-token",
      expiresIn: 3600,
      scope: "openid",
    });

    const cmd = refreshCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["default"]?.["api-version"]).toBe("202412");
  });
});
