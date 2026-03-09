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
    uploadDocument: vi.fn().mockResolvedValue("urn:li:document:D111222333"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("media upload-document", () => {
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
    vi.mocked(coreMock.uploadDocument).mockResolvedValue("urn:li:document:D111222333");
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
    tempDir = await mkdtemp(join(tmpdir(), "linkedctl-test-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a PDF document", async () => {
    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf-content");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        owner: "urn:li:person:person123",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("uploads a DOCX document", async () => {
    const filePath = join(tempDir, "proposal.docx");
    await writeFile(filePath, "fake-docx-content");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalled();
  });

  it("uploads a PPTX document", async () => {
    const filePath = join(tempDir, "slides.pptx");
    await writeFile(filePath, "fake-pptx-content");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalled();
  });

  it("uploads a DOC document", async () => {
    const filePath = join(tempDir, "legacy.doc");
    await writeFile(filePath, "fake-doc-content");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalled();
  });

  it("uploads a PPT document", async () => {
    const filePath = join(tempDir, "legacy.ppt");
    await writeFile(filePath, "fake-ppt-content");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalled();
  });

  it("rejects unsupported file extension", async () => {
    const filePath = join(tempDir, "image.png");
    await writeFile(filePath, "fake-image");

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath])).rejects.toThrow(
      /Unsupported file type/,
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath, "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:document:D111222333" });
  });

  it("outputs document URN in the result", async () => {
    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath, "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("urn:li:document:D111222333");
  });

  it("resolves config with profile from global options", async () => {
    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "media", "upload-document", filePath]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.uploadDocument).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath])).rejects.toThrow(
      /Failed to upload document/,
    );
  });

  it("rejects invalid --format value", async () => {
    const filePath = join(tempDir, "deck.pdf");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath, "--format", "xml"]),
    ).rejects.toThrow(/Allowed choices are json, table/);
  });

  it("accepts case-insensitive file extensions", async () => {
    const filePath = join(tempDir, "deck.PDF");
    await writeFile(filePath, "fake-pdf");

    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "media", "upload-document", filePath]);

    expect(coreMock.uploadDocument).toHaveBeenCalled();
  });
});
