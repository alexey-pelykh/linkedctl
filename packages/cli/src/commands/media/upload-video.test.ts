// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createProgram } from "../../program.js";

vi.mock("@linkedctl/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@linkedctl/core")>();
  return {
    ...actual,
    resolveConfig: vi.fn().mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    }),
    getCurrentPersonUrn: vi.fn().mockResolvedValue("urn:li:person:person123"),
    uploadVideo: vi.fn().mockResolvedValue("urn:li:video:V1234567890"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("media upload-video", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    });
    vi.mocked(coreMock.uploadVideo).mockResolvedValue("urn:li:video:V1234567890");
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
    tempDir = await mkdtemp(join(tmpdir(), "linkedctl-test-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a video file and outputs the video URN", async () => {
    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(1024));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath]);

    expect(coreMock.uploadVideo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        owner: "urn:li:person:person123",
        data: expect.any(Buffer),
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("outputs JSON when --format json is specified", async () => {
    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(512));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath, "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:video:V1234567890" });
  });

  it("resolves config with profile from global options", async () => {
    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(256));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "media", "upload-video", filePath]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
      }),
    );
  });

  it("prints upload progress to stderr", async () => {
    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(2048));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("2048 bytes"));
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.uploadVideo).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(128));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath])).rejects.toThrow(
      /Failed to upload video/,
    );
  });

  it("throws when file does not exist", async () => {
    const filePath = join(tempDir, "nonexistent.mp4");

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath])).rejects.toThrow(
      /ENOENT/,
    );
  });

  it("rejects invalid --format value", async () => {
    const filePath = join(tempDir, "clip.mp4");
    await writeFile(filePath, Buffer.alloc(128));

    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "media", "upload-video", filePath, "--format", "xml"]),
    ).rejects.toThrow(/Allowed choices are json, table/);
  });
});
