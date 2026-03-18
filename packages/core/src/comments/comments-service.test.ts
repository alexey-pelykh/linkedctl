// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { createComment, listComments, getComment, deleteComment } from "./comments-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(overrides: Partial<LinkedInClient> = {}): LinkedInClient {
  return {
    create: vi.fn().mockResolvedValue("urn:li:comment:(urn:li:activity:100,200)"),
    request: vi.fn().mockResolvedValue(undefined),
    requestVoid: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LinkedInClient;
}

describe("createComment", () => {
  it("calls client.create with correct path and body", async () => {
    const client = mockClient();
    await createComment(client, {
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "Great post!",
    });

    expect(client.create).toHaveBeenCalledWith("/rest/comments", {
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: { text: "Great post!" },
    });
  });

  it("escapes REST.li reserved characters in message text", async () => {
    const client = mockClient();
    await createComment(client, {
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "Great post (really)!",
    });

    expect(client.create).toHaveBeenCalledWith("/rest/comments", {
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: { text: "Great post \\(really\\)!" },
    });
  });

  it("returns the comment URN from create", async () => {
    const client = mockClient();
    const urn = await createComment(client, {
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "Nice!",
    });

    expect(urn).toBe("urn:li:comment:(urn:li:activity:100,200)");
  });
});

describe("listComments", () => {
  it("calls client.request with correct path and query parameter", async () => {
    const client = mockClient({
      request: vi.fn().mockResolvedValue({ elements: [] }),
    });
    await listComments(client, { object: "urn:li:share:123" });

    expect(client.request).toHaveBeenCalledWith(
      `/rest/comments?q=comments&article=${encodeURIComponent("urn:li:share:123")}`,
    );
  });

  it("maps API response elements to Comment objects", async () => {
    const client = mockClient({
      request: vi.fn().mockResolvedValue({
        elements: [
          {
            $URN: "urn:li:comment:(urn:li:activity:100,200)",
            actor: "urn:li:person:abc",
            object: "urn:li:share:123",
            message: { text: "First comment" },
            created: { time: 1700000000000 },
          },
          {
            $URN: "urn:li:comment:(urn:li:activity:100,201)",
            actor: "urn:li:person:def",
            object: "urn:li:share:123",
            message: { text: "Second comment" },
            created: { time: 1700000060000 },
          },
        ],
      }),
    });

    const comments = await listComments(client, { object: "urn:li:share:123" });

    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({
      urn: "urn:li:comment:(urn:li:activity:100,200)",
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "First comment",
      createdAt: new Date(1700000000000).toISOString(),
    });
    expect(comments[1]).toEqual({
      urn: "urn:li:comment:(urn:li:activity:100,201)",
      actor: "urn:li:person:def",
      object: "urn:li:share:123",
      message: "Second comment",
      createdAt: new Date(1700000060000).toISOString(),
    });
  });

  it("returns empty array when no comments exist", async () => {
    const client = mockClient({
      request: vi.fn().mockResolvedValue({ elements: [] }),
    });

    const comments = await listComments(client, { object: "urn:li:share:123" });

    expect(comments).toEqual([]);
  });
});

describe("getComment", () => {
  it("calls client.request with URL-encoded comment URN", async () => {
    const commentUrn = "urn:li:comment:(urn:li:activity:100,200)";
    const client = mockClient({
      request: vi.fn().mockResolvedValue({
        $URN: commentUrn,
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: { text: "A comment" },
        created: { time: 1700000000000 },
      }),
    });

    await getComment(client, { commentUrn });

    expect(client.request).toHaveBeenCalledWith(`/rest/comments/${encodeURIComponent(commentUrn)}`);
  });

  it("maps API response to Comment object", async () => {
    const commentUrn = "urn:li:comment:(urn:li:activity:100,200)";
    const client = mockClient({
      request: vi.fn().mockResolvedValue({
        $URN: commentUrn,
        actor: "urn:li:person:abc",
        object: "urn:li:share:123",
        message: { text: "A comment" },
        created: { time: 1700000000000 },
      }),
    });

    const comment = await getComment(client, { commentUrn });

    expect(comment).toEqual({
      urn: commentUrn,
      actor: "urn:li:person:abc",
      object: "urn:li:share:123",
      message: "A comment",
      createdAt: new Date(1700000000000).toISOString(),
    });
  });
});

describe("deleteComment", () => {
  it("calls client.requestVoid with DELETE method and URL-encoded URN", async () => {
    const commentUrn = "urn:li:comment:(urn:li:activity:100,200)";
    const client = mockClient();

    await deleteComment(client, { commentUrn });

    expect(client.requestVoid).toHaveBeenCalledWith(`/rest/comments/${encodeURIComponent(commentUrn)}`, {
      method: "DELETE",
    });
  });
});
