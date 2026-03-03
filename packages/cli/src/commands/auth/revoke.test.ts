// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { revokeCommand } from "./revoke.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("auth revoke", () => {
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    configPath = tempConfigPath();
    vi.spyOn(configFile, "getDefaultConfigPath").mockReturnValue(configPath);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(configPath, ".."), { recursive: true, force: true });
  });

  it("revokes token server-side and clears local credentials", async () => {
    const revokeSpy = vi.spyOn(configFile, "revokeAccessToken").mockResolvedValueOnce(undefined);

    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: {
          "access-token": "secret-token",
          "api-version": "202501",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
        },
      },
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    expect(revokeSpy).toHaveBeenCalledWith("my-client-id", "my-client-secret", "secret-token");

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(config.profiles?.["personal"]?.["api-version"]).toBe("202501");
    expect(consoleSpy).toHaveBeenCalledWith('Access token revoked server-side for profile "personal".');
    expect(consoleSpy).toHaveBeenCalledWith('Local credentials cleared for profile "personal".');
  });

  it("clears local credentials with warning when server-side revocation fails", async () => {
    vi.spyOn(configFile, "revokeAccessToken").mockRejectedValueOnce(new Error("network error"));

    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: {
          "access-token": "secret-token",
          "api-version": "202501",
          "client-id": "my-client-id",
          "client-secret": "my-client-secret",
        },
      },
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(warnSpy).toHaveBeenCalledWith("Warning: Server-side revocation failed: network error");
    expect(consoleSpy).toHaveBeenCalledWith('Local credentials cleared for profile "personal".');
  });

  it("clears local credentials when client credentials are missing", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: {
          "access-token": "secret-token",
          "api-version": "202501",
        },
      },
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No complete credentials for server-side revocation"),
    );
  });

  it("clears local credentials when access token is empty", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: {
          "access-token": "",
          "api-version": "202501",
          "client-id": "cid",
          "client-secret": "csecret",
        },
      },
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("No complete credentials for server-side revocation"),
    );
  });

  it("throws when profile does not exist", async () => {
    const cmd = revokeCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("preserves other profiles", async () => {
    vi.spyOn(configFile, "revokeAccessToken").mockResolvedValueOnce(undefined);

    await writeConfigFile(configPath, {
      "default-profile": "a",
      profiles: {
        a: {
          "access-token": "tok-a",
          "api-version": "202501",
          "client-id": "cid",
          "client-secret": "csecret",
        },
        b: { "access-token": "tok-b", "api-version": "202501" },
      },
    });

    const cmd = revokeCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["a"]?.["access-token"]).toBe("");
    expect(config.profiles?.["b"]?.["access-token"]).toBe("tok-b");
  });
});
