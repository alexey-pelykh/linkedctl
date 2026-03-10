// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { setupMcpTestClient } from "./test-setup.js";

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
  listOrganizations: vi.fn(),
  getOrganization: vi.fn(),
  getOrganizationFollowerCount: vi.fn(),
  getPostAnalytics: vi.fn(),
  getMemberAnalytics: vi.fn(),
  getOrgStats: vi.fn(),
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
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  uploadImage,
  uploadVideo,
  uploadDocument,
  listOrganizations,
} from "@linkedctl/core";

describe("post tools", () => {
  const { getClient } = setupMcpTestClient();

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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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
      const result = await getClient().callTool({
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
      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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
      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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

      const result = await getClient().callTool({
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
      const result = await getClient().callTool({
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

    it("creates a post as organization when as_org is provided", async () => {
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
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [{ organization: "urn:li:organization:98765", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 100, start: 0 },
      });
      vi.mocked(createPost).mockResolvedValue("urn:li:share:orgPost789");

      const result = await getClient().callTool({
        name: "post_create",
        arguments: { text: "Company update", as_org: "98765" },
      });

      expect(resolveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredScopes: expect.arrayContaining(["w_organization_social"]),
        }),
      );
      expect(getCurrentPersonUrn).not.toHaveBeenCalled();
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          author: "urn:li:organization:98765",
          text: "Company update",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:orgPost789" }]);
    });

    it("uses org URN as owner for file uploads when as_org is specified", async () => {
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
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [{ organization: "urn:li:organization:12345", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 100, start: 0 },
      });
      vi.mocked(readFile).mockResolvedValue(Buffer.from("fake-image"));
      vi.mocked(uploadImage).mockResolvedValue("urn:li:image:org456");
      vi.mocked(createPost).mockResolvedValue("urn:li:share:org789");

      const result = await getClient().callTool({
        name: "post_create",
        arguments: { text: "Org image post", image_file: "/path/to/logo.jpg", as_org: "12345" },
      });

      expect(uploadImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner: "urn:li:organization:12345",
        }),
      );
      expect(createPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          author: "urn:li:organization:12345",
        }),
      );
      expect(result.content).toEqual([{ type: "text", text: "Post created: urn:li:share:org789" }]);
    });

    it("returns error when user is not an administrator of the organization", async () => {
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
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [],
        paging: { count: 100, start: 0 },
      });

      const result = await getClient().callTool({
        name: "post_create",
        arguments: { text: "Org post", as_org: "99999" },
      });

      expect(result.content).toEqual([{ type: "text", text: "You are not an administrator of organization 99999" }]);
      expect(result.isError).toBe(true);
      expect(createPost).not.toHaveBeenCalled();
    });

    it("does not require w_organization_social scope for personal posts", async () => {
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

      await getClient().callTool({
        name: "post_create",
        arguments: { text: "Personal post" },
      });

      expect(resolveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredScopes: expect.not.arrayContaining(["w_organization_social"]),
        }),
      );
    });
  });

  describe("post_create auth error", () => {
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
      vi.mocked(getCurrentPersonUrn).mockRejectedValue(new LinkedInAuthError("HTTP 401: Unauthorized"));

      const result = await getClient().callTool({
        name: "post_create",
        arguments: { text: "Hello world" },
      });

      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining('Run "linkedctl auth login" to re-authenticate'),
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it("re-throws non-auth errors", async () => {
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
      vi.mocked(getCurrentPersonUrn).mockRejectedValue(new Error("Server error"));

      const result = await getClient().callTool({
        name: "post_create",
        arguments: { text: "Hello world" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: "text", text: "Server error" }]);
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

      const result = await getClient().callTool({
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

      await getClient().callTool({
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

      const result = await getClient().callTool({
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

      await getClient().callTool({
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

    it("lists posts as organization when as_org is provided", async () => {
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
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [{ organization: "urn:li:organization:98765", role: "ADMINISTRATOR", state: "APPROVED" }],
        paging: { count: 100, start: 0 },
      });
      vi.mocked(listPosts).mockResolvedValue({
        elements: [],
        paging: { count: 10, start: 0 },
      });

      const result = await getClient().callTool({
        name: "post_list",
        arguments: { as_org: "98765" },
      });

      expect(resolveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredScopes: expect.arrayContaining(["r_organization_social"]),
        }),
      );
      expect(getCurrentPersonUrn).not.toHaveBeenCalled();
      expect(listPosts).toHaveBeenCalledWith(expect.anything(), {
        author: "urn:li:organization:98765",
        count: undefined,
        start: undefined,
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text) as Record<string, unknown>;
      expect(parsed).toHaveProperty("elements");
    });

    it("rejects as_org when user is not an administrator", async () => {
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
      vi.mocked(listOrganizations).mockResolvedValue({
        elements: [],
        paging: { count: 100, start: 0 },
      });

      const result = await getClient().callTool({
        name: "post_list",
        arguments: { as_org: "99999" },
      });

      expect(result.content).toEqual([{ type: "text", text: "You are not an administrator of organization 99999" }]);
      expect(result.isError).toBe(true);
      expect(listPosts).not.toHaveBeenCalled();
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

      const result = await getClient().callTool({
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

      await getClient().callTool({
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

      const result = await getClient().callTool({
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

      await getClient().callTool({
        name: "post_delete",
        arguments: { urn: "urn:li:share:456", profile: "work" },
      });

      expect(resolveConfig).toHaveBeenCalledWith({
        profile: "work",
        requiredScopes: ["openid", "profile", "email", "w_member_social"],
      });
    });
  });
});
