// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { logoutCommand } from "./logout.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("auth logout", () => {
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

  it("clears access token from the default profile", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: { personal: { "access-token": "secret-token", "api-version": "202501" } },
    });

    const cmd = logoutCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(config.profiles?.["personal"]?.["api-version"]).toBe("202501");
    expect(consoleSpy).toHaveBeenCalledWith('Credentials cleared for profile "personal".');
  });

  it("clears refresh token when present", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "tok", "refresh-token": "refresh-tok", "api-version": "202501" },
      },
    });

    const cmd = logoutCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("");
    expect(config.profiles?.["personal"]?.["refresh-token"]).toBeUndefined();
    expect(config.profiles?.["personal"]?.["api-version"]).toBe("202501");
  });

  it("throws when profile does not exist", async () => {
    const cmd = logoutCommand();
    await expect(cmd.parseAsync([], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("preserves other profiles", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "a",
      profiles: {
        a: { "access-token": "tok-a", "api-version": "202501" },
        b: { "access-token": "tok-b", "api-version": "202501" },
      },
    });

    const cmd = logoutCommand();
    await cmd.parseAsync([], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["a"]?.["access-token"]).toBe("");
    expect(config.profiles?.["b"]?.["access-token"]).toBe("tok-b");
  });
});
