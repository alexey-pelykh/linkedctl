// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("@linkedctl/core", () => ({
  resolveConfig: vi.fn(),
  LinkedInClient: vi.fn(),
  LinkedInAuthError: class LinkedInAuthError extends Error {
    public readonly status = 401;
    constructor(message: string) {
      super(message);
      this.name = "LinkedInAuthError";
    }
  },
  getCurrentPersonUrn: vi.fn(),
  getUserInfo: vi.fn(),
  createTextPost: vi.fn(),
  createPost: vi.fn(),
  createComment: vi.fn(),
  listComments: vi.fn(),
  getComment: vi.fn(),
  deleteComment: vi.fn(),
  getPost: vi.fn(),
  listPosts: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  uploadImage: vi.fn(),
  uploadVideo: vi.fn(),
  uploadDocument: vi.fn(),
  createReaction: vi.fn(),
  listReactions: vi.fn(),
  deleteReaction: vi.fn(),
  SUPPORTED_IMAGE_TYPES: new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".gif", "image/gif"],
  ]),
  DOCUMENT_EXTENSIONS: [".pdf", ".docx", ".pptx", ".doc", ".ppt"],
  DOCUMENT_MAX_SIZE_BYTES: 100 * 1024 * 1024,
  REACTION_TYPES: ["LIKE", "PRAISE", "EMPATHY", "INTEREST", "APPRECIATION", "ENTERTAINMENT"],
  loadConfigFile: vi.fn(),
  validateConfig: vi.fn(),
  getTokenExpiry: vi.fn(),
  clearOAuthTokens: vi.fn(),
  revokeAccessToken: vi.fn(),
}));

import { readFile, stat } from "node:fs/promises";
import {
  resolveConfig,
  LinkedInClient,
  LinkedInAuthError,
  getCurrentPersonUrn,
  getUserInfo,
  createPost,
  createComment,
  listComments,
  getComment,
  deleteComment,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  uploadImage,
  uploadVideo,
  uploadDocument,
  createReaction,
  listReactions,
  deleteReaction,
  loadConfigFile,
  validateConfig,
  getTokenExpiry,
  clearOAuthTokens,
  revokeAccessToken,
} from "@linkedctl/core";

describe("createMcpServer", () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const server = createMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    cleanup = async () => {
      await client.close();
      await server.close();
    };
  });

  afterEach(async () => {
    await cleanup();
  });

  it("lists all registered tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    expect(toolNames).toContain("whoami");
    expect(toolNames).toContain("post_create");
    expect(toolNames).toContain("comment_create");
    expect(toolNames).toContain("comment_list");
    expect(toolNames).toContain("comment_get");
    expect(toolNames).toContain("comment_delete");
    expect(toolNames).toContain("document_upload");
    expect(toolNames).toContain("reaction_create");
    expect(toolNames).toContain("reaction_list");
    expect(toolNames).toContain("reaction_delete");
    expect(toolNames).toContain("post_get");
    expect(toolNames).toContain("post_list");
    expect(toolNames).toContain("post_update");
    expect(toolNames).toContain("post_delete");
    expect(toolNames).toContain("auth_status");
    expect(toolNames).toContain("auth_revoke");
  });

  describe("whoami", () => {
    it("returns user name, email, and picture", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: "abc123",
        name: "Jane Doe",
        given_name: "Jane",
        family_name: "Doe",
        picture: "https://media.licdn.com/photo.jpg",
        email: "jane@example.com",
        email_verified: true,
      });

      const result = await client.callTool({
        name: "whoami",
        arguments: {},
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email"],
      });
      expect(result.content).toEqual([
        {
          type: "text",
          text: "Name: Jane Doe\nEmail: jane@example.com\nPicture: https://media.licdn.com/photo.jpg",
        },
      ]);
    });

    it("passes profile option", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: "xyz789",
        name: "John Smith",
        given_name: "John",
        family_name: "Smith",
        picture: "https://media.licdn.com/photo2.jpg",
        email: "john@example.com",
        email_verified: true,
      });

      const result = await client.callTool({
        name: "whoami",
        arguments: { profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email"],
      });
      expect(result.content).toEqual([
        {
          type: "text",
          text: "Name: John Smith\nEmail: john@example.com\nPicture: https://media.licdn.com/photo2.jpg",
        },
      ]);
    });

    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "expired-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getUserInfo).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await client.callTool({
        name: "whoami",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe("post_create", () => {
    it("creates a text-only post and returns the URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:post456");

      const result = await client.callTool({
        name: "post_create",
        arguments: { text: "Hello LinkedIn" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          author: "urn:li:person:abc123",
          text: "Hello LinkedIn",
          visibility: "PUBLIC",
          content: undefined,
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:post456" }]);
    });

    it("passes profile and visibility options", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:post789");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Connections only",
          visibility: "CONNECTIONS",
          profile: "work",
        },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          visibility: "CONNECTIONS",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:post789" }]);
    });

    it("creates a post with image attachment", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:img001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Check this image",
          image: "urn:li:image:C5608AQ123",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:image:C5608AQ123" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:img001" }]);
    });

    it("creates a post with video attachment", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:vid001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Watch this video",
          video: "urn:li:video:D5608AQ456",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:video:D5608AQ456" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:vid001" }]);
    });

    it("creates a post with document attachment", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:doc001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Read this document",
          document: "urn:li:document:D789",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:document:D789" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:doc001" }]);
    });

    it("creates a post with article URL attachment", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:art001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Great article",
          article_url: "https://example.com/article",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { article: { source: "https://example.com/article" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:art001" }]);
    });

    it("creates a multi-image post", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:multi001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Photo gallery",
          images: ["urn:li:image:A1", "urn:li:image:A2", "urn:li:image:A3"],
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: {
            multiImage: {
              images: [{ id: "urn:li:image:A1" }, { id: "urn:li:image:A2" }, { id: "urn:li:image:A3" }],
            },
          },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:multi001" }]);
    });

    it("returns error when multiple media options are specified", async () => {
      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Conflicting",
          image: "urn:li:image:X",
          video: "urn:li:video:Y",
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Only one content option"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("returns error when images array has fewer than 2 items", async () => {
      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Single image in array",
          images: ["urn:li:image:A1"],
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("at least 2"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("uploads an image file and creates a post with image_file", async () => {
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-image-data"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadImage).mockResolvedValue("urn:li:image:UPLOADED1");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:imgfile001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Photo from file",
          image_file: "/path/to/photo.jpg",
        },
      });

      expect(uploadImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:person:abc123",
          contentType: "image/jpeg",
        }),
      );
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:image:UPLOADED1" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:imgfile001" }]);
    });

    it("returns error for unsupported image format in image_file", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "BMP post",
          image_file: "/path/to/photo.bmp",
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Unsupported image format"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("uploads a video file and creates a post with video_file", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024, isFile: () => true } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-video-data"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadVideo).mockResolvedValue("urn:li:video:UPLOADED1");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:vidfile001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Video from file",
          video_file: "/path/to/clip.mp4",
        },
      });

      expect(uploadVideo).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:person:abc123",
        }),
      );
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:video:UPLOADED1" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:vidfile001" }]);
    });

    it("uploads a document file and creates a post with document_file", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-data"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:UPLOADED1");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:docfile001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Document from file",
          document_file: "/path/to/deck.pdf",
        },
      });

      expect(uploadDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:person:abc123",
        }),
      );
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: { media: { id: "urn:li:document:UPLOADED1" } },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:docfile001" }]);
    });

    it("returns error for unsupported document format in document_file", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "TXT post",
          document_file: "/path/to/file.txt",
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Unsupported file type"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("uploads multiple image files and creates a multi-image post with image_files", async () => {
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-image-data"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadImage).mockResolvedValueOnce("urn:li:image:UP1").mockResolvedValueOnce("urn:li:image:UP2");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:multifile001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Gallery from files",
          image_files: ["/path/to/a.jpg", "/path/to/b.png"],
        },
      });

      expect(uploadImage).toHaveBeenCalledTimes(2);
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: {
            multiImage: {
              images: [{ id: "urn:li:image:UP1" }, { id: "urn:li:image:UP2" }],
            },
          },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:multifile001" }]);
    });

    it("returns error when image_files has fewer than 2 items", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Single file",
          image_files: ["/path/to/a.jpg"],
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("at least 2"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("creates a draft post when draft is true", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:draft001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Draft post",
          draft: true,
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Draft post",
          lifecycleState: "DRAFT",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:draft001" }]);
    });

    it("defaults to PUBLISHED when draft is not specified", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:pub001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Published post",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Published post",
          lifecycleState: "PUBLISHED",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:pub001" }]);
    });

    it("returns error when combining file and URN media options", async () => {
      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Conflicting",
          image: "urn:li:image:X",
          image_file: "/path/to/photo.jpg",
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Only one content option"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("creates a poll post", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:poll001");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Vote now!",
          poll: "Favorite language?",
          poll_options: ["TypeScript", "Python"],
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: {
            poll: {
              question: "Favorite language?",
              options: [{ text: "TypeScript" }, { text: "Python" }],
              settings: { duration: "THREE_DAYS" },
            },
          },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:poll001" }]);
    });

    it("creates a poll post with custom duration", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:poll002");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Quick poll",
          poll: "Yes or no?",
          poll_options: ["Yes", "No"],
          poll_duration: "ONE_DAY",
        },
      });

      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: {
            poll: {
              question: "Yes or no?",
              options: [{ text: "Yes" }, { text: "No" }],
              settings: { duration: "ONE_DAY" },
            },
          },
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:poll002" }]);
    });

    it("returns error when poll has fewer than 2 options", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Bad poll",
          poll: "Question?",
          poll_options: ["Only one"],
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("at least 2"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("returns error when poll has more than 4 options", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");

      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Too many options",
          poll: "Question?",
          poll_options: ["A", "B", "C", "D", "E"],
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("at most 4"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("returns error when combining poll with image", async () => {
      const result = await client.callTool({
        name: "post_create",
        arguments: {
          text: "Conflicting",
          poll: "Question?",
          poll_options: ["A", "B"],
          image: "urn:li:image:X",
        },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Only one content option"),
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe("comment_create", () => {
    it("creates a comment and returns the URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(createComment).mockResolvedValue("urn:li:comment:(urn:li:activity:100,200)");

      const result = await client.callTool({
        name: "comment_create",
        arguments: {
          post_urn: "urn:li:share:123",
          text: "Great post!",
        },
      });

      expect(createComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actor: "urn:li:person:abc123",
          object: "urn:li:share:123",
          message: "Great post!",
        }),
      );
      expect(result.content).toEqual([
        { type: "text", text: "Comment created: urn:li:comment:(urn:li:activity:100,200)" },
      ]);
    });
  });

  describe("comment_list", () => {
    it("lists comments on a post", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listComments).mockResolvedValue([
        {
          urn: "urn:li:comment:(urn:li:activity:100,200)",
          actor: "urn:li:person:abc",
          object: "urn:li:share:123",
          message: "Great post!",
          createdAt: "2024-11-14T22:13:20.000Z",
        },
      ]);

      const result = await client.callTool({
        name: "comment_list",
        arguments: { post_urn: "urn:li:share:123" },
      });

      expect(listComments).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ object: "urn:li:share:123" }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Great post!"),
        },
      ]);
    });

    it("returns message when no comments exist", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listComments).mockResolvedValue([]);

      const result = await client.callTool({
        name: "comment_list",
        arguments: { post_urn: "urn:li:share:123" },
      });

      expect(result.content).toEqual([{ type: "text", text: "No comments found." }]);
    });
  });

  describe("comment_get", () => {
    it("gets a comment by URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getComment).mockResolvedValue({
        urn: "urn:li:comment:(urn:li:activity:100,200)",
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: "A comment",
        createdAt: "2024-11-14T22:13:20.000Z",
      });

      const result = await client.callTool({
        name: "comment_get",
        arguments: { comment_urn: "urn:li:comment:(urn:li:activity:100,200)" },
      });

      expect(getComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
        }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("A comment"),
        },
      ]);
    });
  });

  describe("comment_delete", () => {
    it("deletes a comment by URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(deleteComment).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "comment_delete",
        arguments: { comment_urn: "urn:li:comment:(urn:li:activity:100,200)" },
      });

      expect(deleteComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentUrn: "urn:li:comment:(urn:li:activity:100,200)",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Comment deleted." }]);
    });
  });

  describe("document_upload", () => {
    it("uploads a document and returns the URN", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:D123");

      const result = await client.callTool({
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(uploadDocument).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:person:abc123",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Document uploaded: urn:li:document:D123" }]);
    });

    it("returns error for unsupported file type", async () => {
      const result = await client.callTool({
        name: "document_upload",
        arguments: { file: "/path/to/image.png" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Unsupported file type"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("returns error when file exceeds size limit", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 200 * 1024 * 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);

      const result = await client.callTool({
        name: "document_upload",
        arguments: { file: "/path/to/huge.pdf" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("exceeds the 100 MB limit"),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("passes profile option", async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as ReturnType<
        typeof import("node:fs/promises").stat
      > extends Promise<infer T>
        ? T
        : never);
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-pdf-content"));
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(uploadDocument).mockResolvedValue("urn:li:document:D456");

      await client.callTool({
        name: "document_upload",
        arguments: { file: "/path/to/deck.pdf", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });
  });

  describe("post_get", () => {
    it("fetches a post by URN and returns JSON", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getPost).mockResolvedValue({
        id: "urn:li:share:123",
        author: "urn:li:person:abc123",
        commentary: "Hello world",
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        isReshareDisabledByAuthor: false,
      });

      const result = await client.callTool({
        name: "post_get",
        arguments: { urn: "urn:li:share:123" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(getPost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123");
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("id", "urn:li:share:123");
      expect(parsed).toHaveProperty("commentary", "Hello world");
    });

    it("passes profile option", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getPost).mockResolvedValue({
        id: "urn:li:share:456",
        author: "urn:li:person:abc123",
        commentary: "Test",
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        isReshareDisabledByAuthor: false,
      });

      await client.callTool({
        name: "post_get",
        arguments: { urn: "urn:li:share:456", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });
  });

  describe("post_list", () => {
    it("lists posts for authenticated user", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(listPosts).mockResolvedValue({
        elements: [
          {
            id: "urn:li:share:100",
            author: "urn:li:person:abc123",
            commentary: "Post one",
            visibility: "PUBLIC",
            lifecycleState: "PUBLISHED",
            distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
            isReshareDisabledByAuthor: false,
          },
        ],
        paging: { count: 10, start: 0, total: 1 },
      });

      const result = await client.callTool({
        name: "post_list",
        arguments: {},
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(listPosts).toHaveBeenCalledWith(expect.anything(), {
        author: "urn:li:person:abc123",
        count: undefined,
        start: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("elements");
      expect(parsed).toHaveProperty("paging");
    });

    it("passes count and start options", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(listPosts).mockResolvedValue({
        elements: [],
        paging: { count: 5, start: 10 },
      });

      await client.callTool({
        name: "post_list",
        arguments: { count: 5, start: 10, profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(listPosts).toHaveBeenCalledWith(expect.anything(), {
        author: "urn:li:person:abc123",
        count: 5,
        start: 10,
      });
    });
  });

  describe("post_update", () => {
    it("updates post commentary and returns confirmation", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(updatePost).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "post_update",
        arguments: { urn: "urn:li:share:123", text: "Updated text" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(updatePost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123", { text: "Updated text" });
      expect(result.content).toEqual([{ type: "text", text: "Post updated: urn:li:share:123" }]);
    });

    it("passes profile option", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(updatePost).mockResolvedValue(undefined);

      await client.callTool({
        name: "post_update",
        arguments: { urn: "urn:li:share:123", text: "New text", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });
  });

  describe("post_delete", () => {
    it("deletes a post and returns confirmation", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(deletePost).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "post_delete",
        arguments: { urn: "urn:li:share:123" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(deletePost).toHaveBeenCalledWith(expect.anything(), "urn:li:share:123");
      expect(result.content).toEqual([{ type: "text", text: "Post deleted: urn:li:share:123" }]);
    });

    it("passes profile option", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(deletePost).mockResolvedValue(undefined);

      await client.callTool({
        name: "post_delete",
        arguments: { urn: "urn:li:share:456", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });
  });

  describe("auth_status", () => {
    it("reports not configured when profile has no token", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({ raw: undefined, path: undefined });
      vi.mocked(validateConfig).mockReturnValue({
        config: {},
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(loadConfigFile).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: not configured"),
        },
      ]);
    });

    it("reports authenticated with expiry for valid JWT", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "valid-jwt-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "valid-jwt-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(getTokenExpiry).mockReturnValue({
        expiresAt: new Date("2099-12-31T23:59:59Z"),
        isExpired: false,
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: authenticated"),
        },
      ]);
    });

    it("reports expired for expired token", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "expired-jwt-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "expired-jwt-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(getTokenExpiry).mockReturnValue({
        expiresAt: new Date("2020-01-01T00:00:00Z"),
        isExpired: true,
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Status: expired"),
        },
      ]);
    });

    it("reports unknown expiry for non-JWT token", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { oauth: { "access-token": "opaque-token" }, "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "opaque-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(getTokenExpiry).mockReturnValue(undefined);

      const result = await client.callTool({
        name: "auth_status",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("unknown (token is not a JWT)"),
        },
      ]);
    });

    it("uses specified profile name", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({ raw: undefined, path: undefined });
      vi.mocked(validateConfig).mockReturnValue({
        config: {},
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_status",
        arguments: { profile: "work" },
      });

      expect(loadConfigFile).toHaveBeenCalledWith({ profile: "work" });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Profile: work"),
        },
      ]);
    });
  });

  describe("auth_revoke", () => {
    it("revokes token server-side and clears local credentials", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: {
            "access-token": "my-token",
            "client-id": "cid",
            "client-secret": "csecret",
          },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: {
            accessToken: "my-token",
            clientId: "cid",
            clientSecret: "csecret",
          },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(revokeAccessToken).mockResolvedValue(undefined);
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(revokeAccessToken).toHaveBeenCalledWith("cid", "csecret", "my-token");
      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Access token revoked server-side"),
        },
      ]);
    });

    it("clears local credentials with warning when server-side revocation fails", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: {
            "access-token": "my-token",
            "client-id": "cid",
            "client-secret": "csecret",
          },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: {
            accessToken: "my-token",
            clientId: "cid",
            clientSecret: "csecret",
          },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(revokeAccessToken).mockRejectedValue(new Error("network error"));
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Warning: Server-side revocation failed"),
        },
      ]);
    });

    it("returns error when profile has no OAuth config", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: { "api-version": "202401" },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: { apiVersion: "202401" },
        warnings: [],
        errors: [],
      });

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("not found or has no OAuth config"),
        },
      ]);
    });

    it("clears local credentials when client credentials are missing", async () => {
      vi.mocked(loadConfigFile).mockResolvedValue({
        raw: {
          oauth: { "access-token": "my-token" },
          "api-version": "202401",
        },
        path: "/some/path.yaml",
      });
      vi.mocked(validateConfig).mockReturnValue({
        config: {
          oauth: { accessToken: "my-token" },
          apiVersion: "202401",
        },
        warnings: [],
        errors: [],
      });
      vi.mocked(clearOAuthTokens).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "auth_revoke",
        arguments: {},
      });

      expect(revokeAccessToken).not.toHaveBeenCalled();
      expect(clearOAuthTokens).toHaveBeenCalledWith({ profile: undefined });
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("No complete credentials for server-side revocation"),
        },
      ]);
    });
  });

  describe("reaction_create", () => {
    it("creates a LIKE reaction by default and returns the URN", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(createReaction).mockResolvedValue("urn:li:reaction:r123");

      const result = await client.callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: undefined,
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
      expect(createReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          reactionType: "LIKE",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction created: urn:li:reaction:r123" }]);
    });

    it("creates a reaction with specified type", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(createReaction).mockResolvedValue("urn:li:reaction:r456");

      const result = await client.callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123", reaction_type: "PRAISE" },
      });

      expect(createReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reactionType: "PRAISE",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction created: urn:li:reaction:r456" }]);
    });

    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "expired-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(createReaction).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await client.callTool({
        name: "reaction_create",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe("reaction_list", () => {
    it("lists reactions on a post", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listReactions).mockResolvedValue([
        {
          actor: "urn:li:person:user1",
          entity: "urn:li:share:abc123",
          reactionType: "LIKE",
          createdAt: 1700000000000,
        },
      ]);

      const result = await client.callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(listReactions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
        }),
      );
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("LIKE by urn:li:person:user1"),
        },
      ]);
    });

    it("returns message when no reactions found", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(listReactions).mockResolvedValue([]);

      const result = await client.callTool({
        name: "reaction_list",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([{ type: "text", text: "No reactions found" }]);
    });
  });

  describe("reaction_delete", () => {
    it("deletes the user's reaction from a post", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "test-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(deleteReaction).mockResolvedValue(undefined);

      const result = await client.callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(deleteReaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entity: "urn:li:share:abc123",
          actor: "urn:li:person:abc123",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Reaction deleted" }]);
    });

    it("returns error with re-auth guidance for expired token", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        config: {
          oauth: { accessToken: "expired-token" },
          apiVersion: "202401",
        },
        warnings: [],
      });
      vi.mocked(LinkedInClient).mockImplementation(function () {
        return Object.create(null);
      } as unknown as typeof LinkedInClient);
      vi.mocked(getCurrentPersonUrn).mockResolvedValue("urn:li:person:abc123");
      vi.mocked(deleteReaction).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await client.callTool({
        name: "reaction_delete",
        arguments: { entity_urn: "urn:li:share:abc123" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });
});
