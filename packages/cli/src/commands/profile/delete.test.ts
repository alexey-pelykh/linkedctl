// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { deleteCommand } from "./delete.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("profile delete", () => {
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

  it("removes a profile from config", async () => {
    await writeConfigFile(configPath, {
      profiles: {
        personal: { "access-token": "t1", "api-version": "v" },
        work: { "access-token": "t2", "api-version": "v" },
      },
    });

    const cmd = deleteCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config.profiles?.["work"]).toBeUndefined();
    expect(config.profiles?.["personal"]).toBeDefined();
  });

  it("clears default when deleting the default profile", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "work",
      profiles: {
        work: { "access-token": "t", "api-version": "v" },
      },
    });

    const cmd = deleteCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBeUndefined();
  });

  it("throws when profile does not exist", async () => {
    const cmd = deleteCommand();
    await expect(cmd.parseAsync(["nonexistent"], { from: "user" })).rejects.toThrow(/not found/);
  });
});
