// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { hasCredentials, cliEnv } from "./credentials.js";

const execFileAsync = promisify(execFile);

const CLI_BIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../linkedctl/dist/cli.js");

async function runCli(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("node", [CLI_BIN, ...args], {
    env: { ...process.env, ...cliEnv() },
    timeout: 20_000,
  });
}

describe.skipIf(!hasCredentials())("CLI E2E", () => {
  describe("whoami", () => {
    it("returns user info as JSON", async () => {
      const { stdout } = await runCli("whoami", "--format", "json");
      const data = JSON.parse(stdout) as Record<string, unknown>;

      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("email");
      expect(typeof data["name"]).toBe("string");
      expect(typeof data["email"]).toBe("string");
    });
  });

  describe("post create", () => {
    it("creates a text post and returns the URN", async () => {
      const text = `[E2E test] linkedctl ${new Date().toISOString()}`;
      const { stdout } = await runCli(
        "post",
        "create",
        "--text",
        text,
        "--visibility",
        "CONNECTIONS",
        "--format",
        "json",
      );
      const data = JSON.parse(stdout) as Record<string, unknown>;

      expect(data).toHaveProperty("urn");
      expect(typeof data["urn"]).toBe("string");
      expect(data["urn"]).toMatch(/^urn:li:share:\d+$/);
    });
  });
});
