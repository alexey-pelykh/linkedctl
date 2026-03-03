// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile } from "@linkedctl/core";
import type { ConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { createProgram } from "../../program.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("auth token", () => {
  let configPath: string;

  beforeEach(() => {
    configPath = tempConfigPath();
    vi.spyOn(configFile, "getDefaultConfigPath").mockReturnValue(configPath);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(join(configPath, ".."), { recursive: true, force: true });
  });

  it("stores access token in default profile", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "my-token"]);

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["default"]?.["access-token"]).toBe("my-token");
  });

  it("defaults api-version to 202501 for new profile", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "my-token"]);

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["default"]?.["api-version"]).toBe("202501");
  });

  it("preserves existing api-version when updating token", async () => {
    const initial: ConfigFile = {
      "default-profile": "default",
      profiles: {
        default: { "access-token": "old-token", "api-version": "202502" },
      },
    };
    await writeConfigFile(configPath, initial);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "new-token"]);

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["default"]?.["access-token"]).toBe("new-token");
    expect(config.profiles?.["default"]?.["api-version"]).toBe("202502");
  });

  it("stores token in profile selected by --profile flag", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "--profile",
      "work",
      "auth",
      "token",
      "--access-token",
      "work-token",
    ]);

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["work"]?.["access-token"]).toBe("work-token");
  });

  it("sets first profile as default automatically", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "my-token"]);

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBe("default");
  });

  it("does not overwrite existing default profile", async () => {
    const initial: ConfigFile = {
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "p-token", "api-version": "202501" },
      },
    };
    await writeConfigFile(configPath, initial);

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "auth", "token", "--access-token", "w-token"]);

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBe("personal");
  });

  it("logs confirmation message", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "my-token"]);

    expect(console.log).toHaveBeenCalledWith('Access token stored in profile "default".');
  });

  it("logs profile name when --profile is used", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "auth", "token", "--access-token", "tok"]);

    expect(console.log).toHaveBeenCalledWith('Access token stored in profile "work".');
  });
});
