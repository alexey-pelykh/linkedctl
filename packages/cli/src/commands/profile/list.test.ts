// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { listCommand } from "./list.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("profile list", () => {
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

  it("shows message when no profiles exist", async () => {
    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });
    expect(consoleSpy).toHaveBeenCalledWith("No profiles configured.");
  });

  it("lists profiles with default marker", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "t1", "api-version": "v" },
        work: { "access-token": "t2", "api-version": "v" },
      },
    });

    const cmd = listCommand();
    await cmd.parseAsync([], { from: "user" });
    expect(consoleSpy).toHaveBeenCalledWith("personal (default)");
    expect(consoleSpy).toHaveBeenCalledWith("work");
  });
});
