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
    createTextPost: vi.fn().mockResolvedValue("urn:li:share:111222333"),
    createPost: vi.fn().mockResolvedValue("urn:li:share:111222333"),
  };
});

const coreMock = await import("@linkedctl/core");

describe("post create", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(coreMock.resolveConfig).mockResolvedValue({
      config: {
        oauth: { accessToken: "test-token" },
        apiVersion: "202601",
      },
      warnings: [],
    });
    vi.mocked(coreMock.createPost).mockResolvedValue("urn:li:share:111222333");
    vi.mocked(coreMock.getCurrentPersonUrn).mockResolvedValue("urn:li:person:person123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a post with --text option", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello LinkedIn"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        author: "urn:li:person:person123",
        text: "Hello LinkedIn",
        visibility: "PUBLIC",
      }),
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("creates a post with shorthand: linkedctl post 'Hello'", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "Hello from shorthand"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Hello from shorthand",
      }),
    );
  });

  it("creates a post with shorthand --text option", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "--text", "Hello from text option"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Hello from text option",
      }),
    );
  });

  it("--text takes precedence over positional argument on post shorthand", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "positional", "--text", "from option"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "from option",
      }),
    );
  });

  it("uses CONNECTIONS visibility on post shorthand", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "--text", "Private", "--visibility", "CONNECTIONS"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "CONNECTIONS",
      }),
    );
  });

  it("uses CONNECTIONS visibility when specified", async () => {
    const program = createProgram();
    await program.parseAsync([
      "node",
      "linkedctl",
      "post",
      "create",
      "--text",
      "Private post",
      "--visibility",
      "CONNECTIONS",
    ]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "CONNECTIONS",
      }),
    );
  });

  it("defaults visibility to PUBLIC", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Public post"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "PUBLIC",
      }),
    );
  });

  it("outputs JSON when --format json is specified", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(output)).toEqual({ urn: "urn:li:share:111222333" });
  });

  it("outputs post URN in the result", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "json"]);

    const output = consoleSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("urn:li:share:111222333");
  });

  it("resolves config with profile from global options", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "--profile", "work", "post", "create", "--text", "Hello"]);

    expect(coreMock.resolveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      }),
    );
  });

  it("accepts lowercase --visibility value and normalizes to uppercase", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--visibility", "connections"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "CONNECTIONS",
      }),
    );
  });

  it("accepts mixed-case --visibility value and normalizes to uppercase", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--visibility", "Public"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "PUBLIC",
      }),
    );
  });

  it("accepts lowercase --visibility on post shorthand", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "--text", "Hello", "--visibility", "public"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visibility: "PUBLIC",
      }),
    );
  });

  it("rejects invalid --visibility value", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--visibility", "PRIVATE"]),
    ).rejects.toThrow(/Allowed choices are PUBLIC, CONNECTIONS/);
  });

  it("rejects invalid --format value on post create", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(
      program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello", "--format", "xml"]),
    ).rejects.toThrow(/Allowed choices are json, table/);
  });

  it("rejects invalid --format value on post shorthand", async () => {
    const program = createProgram();
    for (const cmd of program.commands) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }

    await expect(program.parseAsync(["node", "linkedctl", "post", "Hello", "--format", "xml"])).rejects.toThrow(
      /Allowed choices are json, table/,
    );
  });

  it("creates a post with positional argument on post create", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "Hello positional"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "Hello positional",
      }),
    );
  });

  it("--text takes precedence over positional argument on post create", async () => {
    const program = createProgram();
    await program.parseAsync(["node", "linkedctl", "post", "create", "positional", "--text", "from option"]);

    expect(coreMock.createPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: "from option",
      }),
    );
  });

  it("wraps API errors with actionable message", async () => {
    const { LinkedInApiError } = await import("@linkedctl/core");
    vi.mocked(coreMock.createPost).mockRejectedValueOnce(new LinkedInApiError("Forbidden", 403));

    const program = createProgram();
    program.exitOverride();

    await expect(program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Hello"])).rejects.toThrow(
      /Failed to create post/,
    );
  });

  describe("--text-file", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "linkedctl-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("reads post text from a file on post create", async () => {
      const filePath = join(tempDir, "draft.txt");
      await writeFile(filePath, "Hello from file", "utf-8");

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "create", "--text-file", filePath]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Hello from file",
        }),
      );
    });

    it("reads post text from a file on post shorthand", async () => {
      const filePath = join(tempDir, "draft.txt");
      await writeFile(filePath, "Hello from file shorthand", "utf-8");

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "--text-file", filePath]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Hello from file shorthand",
        }),
      );
    });

    it("trims whitespace from file content", async () => {
      const filePath = join(tempDir, "draft.txt");
      await writeFile(filePath, "  Hello trimmed  \n\n", "utf-8");

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "create", "--text-file", filePath]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Hello trimmed",
        }),
      );
    });

    it("--text takes precedence over --text-file on post create", async () => {
      const filePath = join(tempDir, "draft.txt");
      await writeFile(filePath, "from file", "utf-8");

      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "from option",
        "--text-file",
        filePath,
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "from option",
        }),
      );
    });

    it("--text takes precedence over --text-file on post shorthand", async () => {
      const filePath = join(tempDir, "draft.txt");
      await writeFile(filePath, "from file", "utf-8");

      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "--text", "from option", "--text-file", filePath]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "from option",
        }),
      );
    });

    it("produces a clear error when file is not found", async () => {
      const filePath = join(tempDir, "nonexistent.txt");

      const program = createProgram();
      program.exitOverride();

      await expect(
        program.parseAsync(["node", "linkedctl", "post", "create", "--text-file", filePath]),
      ).rejects.toThrow(/ENOENT/);
    });
  });

  describe("media options", () => {
    it("creates a post with --image option", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "Check this",
        "--image",
        "urn:li:image:C5608AQ123",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Check this",
          content: { media: { id: "urn:li:image:C5608AQ123" } },
        }),
      );
    });

    it("creates a post with --video option", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "Watch this",
        "--video",
        "urn:li:video:D5608AQ456",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Watch this",
          content: { media: { id: "urn:li:video:D5608AQ456" } },
        }),
      );
    });

    it("creates a post with --document option", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "Read this",
        "--document",
        "urn:li:document:D789",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Read this",
          content: { media: { id: "urn:li:document:D789" } },
        }),
      );
    });

    it("creates a post with --article-url option", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "Great read",
        "--article-url",
        "https://example.com/article",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Great read",
          content: { article: { source: "https://example.com/article" } },
        }),
      );
    });

    it("creates a post with --images option (multi-image)", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "create",
        "--text",
        "Gallery",
        "--images",
        "urn:li:image:A1,urn:li:image:A2,urn:li:image:A3",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Gallery",
          content: {
            multiImage: {
              images: [{ id: "urn:li:image:A1" }, { id: "urn:li:image:A2" }, { id: "urn:li:image:A3" }],
            },
          },
        }),
      );
    });

    it("rejects --images with fewer than 2 URNs", async () => {
      const program = createProgram();
      program.exitOverride();

      await expect(
        program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Single", "--images", "urn:li:image:A1"]),
      ).rejects.toThrow(/at least 2/);
    });

    it("rejects multiple media options", async () => {
      const program = createProgram();
      program.exitOverride();

      await expect(
        program.parseAsync([
          "node",
          "linkedctl",
          "post",
          "create",
          "--text",
          "Both",
          "--image",
          "urn:li:image:X",
          "--video",
          "urn:li:video:Y",
        ]),
      ).rejects.toThrow(/Only one media option/);
    });

    it("creates a post with --image on post shorthand", async () => {
      const program = createProgram();
      await program.parseAsync([
        "node",
        "linkedctl",
        "post",
        "--text",
        "Shorthand image",
        "--image",
        "urn:li:image:S1",
      ]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Shorthand image",
          content: { media: { id: "urn:li:image:S1" } },
        }),
      );
    });

    it("passes no content when no media option is given", async () => {
      const program = createProgram();
      await program.parseAsync(["node", "linkedctl", "post", "create", "--text", "Plain text"]);

      expect(coreMock.createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Plain text",
          content: undefined,
        }),
      );
    });
  });
});
