// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm, stat } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { createCommand } from "./create.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("profile create", () => {
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

  it("creates a profile with access token and api version", async () => {
    const cmd = createCommand();
    await cmd.parseAsync(["personal", "--access-token", "tok123", "--api-version", "202501"], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["personal"]?.["access-token"]).toBe("tok123");
    expect(config.profiles?.["personal"]?.["api-version"]).toBe("202501");
  });

  it("sets first profile as default automatically", async () => {
    const cmd = createCommand();
    await cmd.parseAsync(["personal", "--access-token", "tok", "--api-version", "v"], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBe("personal");
  });

  it.skipIf(process.platform === "win32")("sets file permissions to 0600", async () => {
    const cmd = createCommand();
    await cmd.parseAsync(["personal", "--access-token", "tok", "--api-version", "v"], { from: "user" });

    const info = await stat(configPath);
    expect(info.mode & 0o777).toBe(0o600);
  });

  it("throws when profile already exists", async () => {
    const cmd1 = createCommand();
    await cmd1.parseAsync(["personal", "--access-token", "tok", "--api-version", "v"], { from: "user" });

    const cmd2 = createCommand();
    await expect(
      cmd2.parseAsync(["personal", "--access-token", "tok2", "--api-version", "v2"], { from: "user" }),
    ).rejects.toThrow(/already exists/);
  });

  it("sets as default when --set-default is used", async () => {
    // Create first profile (auto-default)
    const cmd1 = createCommand();
    await cmd1.parseAsync(["first", "--access-token", "t1", "--api-version", "v"], { from: "user" });

    // Create second profile with --set-default
    const cmd2 = createCommand();
    await cmd2.parseAsync(["second", "--access-token", "t2", "--api-version", "v", "--set-default"], {
      from: "user",
    });

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBe("second");
  });
});
