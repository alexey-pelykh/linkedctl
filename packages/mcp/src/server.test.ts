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
    expect(toolNames).toContain("org_list");
    expect(toolNames).toContain("org_get");
    expect(toolNames).toContain("org_followers");
    expect(toolNames).toContain("stats_post");
    expect(toolNames).toContain("stats_me");
    expect(toolNames).toContain("stats_org");
  });
});
