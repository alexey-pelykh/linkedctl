// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as core from "@linkedctl/core";
import { showCommand } from "./show.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return { ...actual };
});

describe("profile show", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let loadConfigFileSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    loadConfigFileSpy = vi.spyOn(core, "loadConfigFile");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs table format with redacted access token", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: { "access-token": "abcdefghijklmnop" },
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal", "--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("personal");
    expect(output).toContain("abcd****mnop");
    expect(output).toContain("202601");
  });

  it("outputs table format with all redacted oauth fields", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: {
          "client-id": "abcdefghijklmnop",
          "client-secret": "secretsecretsecretsecret",
          "access-token": "tokentokentokentoken",
          "refresh-token": "refreshrefreshrefresh",
          "token-expires-at": "2099-12-31T23:59:59Z",
        },
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/work.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["work", "--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("work");
    expect(output).toContain("abcd****mnop");
    expect(output).toContain("secr****cret");
    expect(output).toContain("toke****oken");
    expect(output).toContain("refr****resh");
    expect(output).toContain("2099-12-31T23:59:59Z");
    expect(output).toContain("202601");
  });

  it("outputs table format with short secrets fully redacted", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: { "access-token": "short" },
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal", "--format", "table"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("****");
  });

  it("outputs JSON with all fields when --format json is specified", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: {
          "client-id": "abcdefghijklmnop",
          "client-secret": "secretsecretsecretsecret",
          "access-token": "tokentokentokentoken",
          "refresh-token": "refreshrefreshrefresh",
          "token-expires-at": "2099-12-31T23:59:59Z",
        },
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/work.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["work", "--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "work",
      clientId: "abcd****mnop",
      clientSecret: "secr****cret",
      accessToken: "toke****oken",
      refreshToken: "refr****resh",
      tokenExpiresAt: "2099-12-31T23:59:59Z",
      apiVersion: "202601",
    });
  });

  it("outputs JSON with nulls for missing fields", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        oauth: { "access-token": "abcdefghijklmnop" },
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/personal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["personal", "--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "personal",
      clientId: null,
      clientSecret: null,
      accessToken: "abcd****mnop",
      refreshToken: null,
      tokenExpiresAt: null,
      apiVersion: "202601",
    });
  });

  it("outputs JSON with all nulls when no oauth is configured", async () => {
    loadConfigFileSpy.mockResolvedValue({
      raw: {
        "api-version": "202601",
      },
      path: "/mock/home/.linkedctl/minimal.yaml",
    });

    const cmd = showCommand();
    await cmd.parseAsync(["minimal", "--format", "json"], { from: "user" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(consoleSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(parsed).toEqual({
      profile: "minimal",
      clientId: null,
      clientSecret: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      apiVersion: "202601",
    });
  });

  it("throws when profile does not exist", async () => {
    loadConfigFileSpy.mockResolvedValue({ raw: undefined, path: undefined });

    const cmd = showCommand();
    await expect(cmd.parseAsync(["nonexistent", "--format", "table"], { from: "user" })).rejects.toThrow(/not found/);
  });

  it("throws for invalid profile name", async () => {
    const cmd = showCommand();
    await expect(cmd.parseAsync(["../evil", "--format", "table"], { from: "user" })).rejects.toThrow(
      /Invalid profile name/,
    );
  });

  it("rejects invalid --format value", async () => {
    const cmd = showCommand();
    cmd.exitOverride();

    await expect(cmd.parseAsync(["personal", "--format", "xml"], { from: "user" })).rejects.toThrow(
      /Allowed choices are json, table/,
    );
  });
});
