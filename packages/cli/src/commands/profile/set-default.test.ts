// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readConfigFile, writeConfigFile } from "@linkedctl/core";
import * as configFile from "@linkedctl/core";
import { setDefaultCommand } from "./set-default.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof configFile>();
  return { ...actual };
});

function tempConfigPath(): string {
  return join(tmpdir(), `linkedctl-test-${randomUUID()}`, "config.yaml");
}

describe("profile set-default", () => {
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

  it("updates the default profile", async () => {
    await writeConfigFile(configPath, {
      "default-profile": "personal",
      profiles: {
        personal: { "access-token": "t1", "api-version": "v" },
        work: { "access-token": "t2", "api-version": "v" },
      },
    });

    const cmd = setDefaultCommand();
    await cmd.parseAsync(["work"], { from: "user" });

    const config = await readConfigFile(configPath);
    expect(config["default-profile"]).toBe("work");
  });

  it("throws when profile does not exist", async () => {
    const cmd = setDefaultCommand();
    await expect(cmd.parseAsync(["nonexistent"], { from: "user" })).rejects.toThrow(/not found/);
  });
});
