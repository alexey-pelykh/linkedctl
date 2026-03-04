// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { whoamiCommand } from "./whoami.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

const SAMPLE_USERINFO: core.UserInfo = {
  sub: "abc123",
  name: "Jane Doe",
  given_name: "Jane",
  family_name: "Doe",
  picture: "https://media.licdn.com/dms/image/example.jpg",
  email: "jane@example.com",
  email_verified: true,
};

describe("whoami", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let resolveConfigSpy: ReturnType<typeof vi.spyOn>;
  let getUserInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    resolveConfigSpy = vi.spyOn(core, "resolveConfig").mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202501",
      },
      warnings: [],
    });
    getUserInfoSpy = vi.spyOn(core, "getUserInfo").mockResolvedValue(SAMPLE_USERINFO);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays user info in table format for TTY", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });

    try {
      const cmd = whoamiCommand();
      await cmd.parseAsync([], { from: "user" });

      expect(resolveConfigSpy).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email"],
      });
      expect(getUserInfoSpy).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalledOnce();

      const output = consoleSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("Jane Doe");
      expect(output).toContain("jane@example.com");
      expect(output).toContain("https://media.licdn.com/dms/image/example.jpg");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
    }
  });

  it("outputs JSON when --format json is specified", async () => {
    const cmd = whoamiCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      picture: "https://media.licdn.com/dms/image/example.jpg",
    });
  });

  it("passes profile flag to resolveConfig", async () => {
    const cmd = whoamiCommand();
    cmd.parent = null;

    // Simulate --profile by creating a parent command
    const { Command } = await import("commander");
    const parent = new Command("linkedctl");
    parent.option("--profile <name>", "profile");
    parent.addCommand(cmd);

    await parent.parseAsync(["whoami", "--profile", "work"], { from: "user" });

    expect(resolveConfigSpy).toHaveBeenCalledWith({ profile: "work", requiredScopes: ["openid", "profile", "email"] });
  });

  it("outputs only name, email, and picture in JSON format", async () => {
    const cmd = whoamiCommand();
    await cmd.parseAsync(["--format", "json"], { from: "user" });

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(Object.keys(parsed)).toEqual(["name", "email", "picture"]);
    expect(parsed).not.toHaveProperty("sub");
    expect(parsed).not.toHaveProperty("given_name");
    expect(parsed).not.toHaveProperty("email_verified");
  });
});
