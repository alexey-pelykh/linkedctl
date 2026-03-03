// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { createProgram } from "../../program.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("auth token", () => {
  let saveOAuthTokensSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saveOAuthTokensSpy = vi.spyOn(core, "saveOAuthTokens").mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores access token via saveOAuthTokens", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "auth", "token", "--access-token", "my-token"]);

    expect(saveOAuthTokensSpy).toHaveBeenCalledWith({ accessToken: "my-token" }, { profile: undefined });
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

    expect(saveOAuthTokensSpy).toHaveBeenCalledWith({ accessToken: "work-token" }, { profile: "work" });
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
