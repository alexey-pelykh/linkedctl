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
    uploadImage: vi.fn().mockResolvedValue("urn:li:image:abc123"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("media upload-image", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    });
    vi.mocked(coreMock.uploadImage).mockResolvedValue("urn:li:image:abc123");
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
    tempDir = await mkdtemp(join(tmpdir(), "linkedctl-test-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a JPEG image and outputs the URN", async () => {
    const filePath = join(tempDir, "photo.jpg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath]);

    expect(coreMock.uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        owner: "urn:li:person:person123",
        contentType: "image/jpeg",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("urn:li:image:abc123");
  });

  it("uploads a PNG image", async () => {
    const filePath = join(tempDir, "banner.png");
    await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath]);

    expect(coreMock.uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contentType: "image/png",
      }),
    );
  });

  it("uploads a GIF image", async () => {
    const filePath = join(tempDir, "animation.gif");
    await writeFile(filePath, Buffer.from([0x47, 0x49, 0x46, 0x38]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath]);

    expect(coreMock.uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contentType: "image/gif",
      }),
    );
  });

  it("rejects unsupported file format", async () => {
    const filePath = join(tempDir, "document.pdf");
    await writeFile(filePath, Buffer.from([0x25, 0x50, 0x44, 0x46]));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath])).rejects.toThrow(
      /Unsupported image format/,
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const filePath = join(tempDir, "photo.jpg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath, "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:image:abc123" });
  });

  it("resolves config with profile from global options", async () => {
    const filePath = join(tempDir, "photo.jpg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "media", "upload-image", filePath]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.uploadImage).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const filePath = join(tempDir, "photo.jpg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath])).rejects.toThrow(
      /Failed to upload image/,
    );
  });

  it("rejects invalid --format value", async () => {
    const filePath = join(tempDir, "photo.jpg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath, "--format", "xml"]),
    ).rejects.toThrow(/Allowed choices are json, table/);
  });

  it("accepts .jpeg extension", async () => {
    const filePath = join(tempDir, "photo.jpeg");
    await writeFile(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-image", filePath]);

    expect(coreMock.uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contentType: "image/jpeg",
      }),
    );
  });
});
