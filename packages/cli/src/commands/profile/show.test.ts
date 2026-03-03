// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { showCommand } from "./show.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("profile show", () => {
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

  it("shows profile with redacted token", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "abcdefghijklmnop", "api-version": "202501" },
      },
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal"], { from: "user" });
    expect(consoleSpy).toHaveBeenCalledWith("Profile: personal (default)");
    expect(consoleSpy).toHaveBeenCalledWith("  access-token: abcd****mnop");
    expect(consoleSpy).toHaveBeenCalledWith("  api-version: 202501");
  });

  it("throws when profile does not exist", async () => {
    const cmd = showCommand();
    await expect(cmd.parseAsync(["nonexistent"], { from: "user" })).rejects.toThrow(/not found/);
  });
});
