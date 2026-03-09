// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { createReaction, listReactions, deleteReaction } from "./reactions-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(overrides?: Partial<LinkedInClient>): LinkedInClient {
  return {
    create: vi.fn().mockResolvedValue("urn:li:reaction:123"),
    request: vi.fn().mockResolvedValue({ elements: [] }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LinkedInClient;
}

describe("createReaction", () => {
  it("calls client.create with correct path and body", async () => {
    const client = mockClient();
    await createReaction(client, { entity: "urn:li:share:abc123" });

    expect(client.create).toHaveBeenCalledWith("/rest/reactions", {
      root: "urn:li:share:abc123",
      reactionType: "LIKE",
    });
  });

  it("defaults reactionType to LIKE", async () => {
    const client = mockClient();
    await createReaction(client, { entity: "urn:li:share:abc123" });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("reactionType", "LIKE");
  });

  it("uses specified reactionType", async () => {
    const client = mockClient();
    await createReaction(client, { entity: "urn:li:share:abc123", reactionType: "PRAISE" });

    expect(client.create).toHaveBeenCalledWith("/rest/reactions", {
      root: "urn:li:share:abc123",
      reactionType: "PRAISE",
    });
  });

  it("returns the reaction URN from create", async () => {
    const client = mockClient({ create: vi.fn().mockResolvedValue("urn:li:reaction:456") });
    const urn = await createReaction(client, { entity: "urn:li:share:abc123" });

    expect(urn).toBe("urn:li:reaction:456");
  });

  it("includes actor in body when specified", async () => {
    const client = mockClient();
    await createReaction(client, { entity: "urn:li:share:abc123", actor: "urn:li:organization:99999" });

    expect(client.create).toHaveBeenCalledWith("/rest/reactions", {
      root: "urn:li:share:abc123",
      reactionType: "LIKE",
      actor: "urn:li:organization:99999",
    });
  });

  it("omits actor from body when not specified", async () => {
    const client = mockClient();
    await createReaction(client, { entity: "urn:li:share:abc123" });

    const body = vi.mocked(client.create).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("actor");
  });
});

describe("listReactions", () => {
  it("calls client.request with correct path and query parameters", async () => {
    const client = mockClient();
    await listReactions(client, { entity: "urn:li:share:abc123" });

    expect(client.request).toHaveBeenCalledWith(expect.stringContaining("/rest/reactions?"));
    const url = vi.mocked(client.request).mock.calls[0]?.[0] as string;
    expect(url).toContain("q=entity");
    expect(url).toContain("entity=urn%3Ali%3Ashare%3Aabc123");
  });

  it("includes count and start when specified", async () => {
    const client = mockClient();
    await listReactions(client, { entity: "urn:li:share:abc123", count: 10, start: 20 });

    const url = vi.mocked(client.request).mock.calls[0]?.[0] as string;
    expect(url).toContain("count=10");
    expect(url).toContain("start=20");
  });

  it("maps response elements to Reaction objects", async () => {
    const client = mockClient({
      request: vi.fn().mockResolvedValue({
        elements: [
          {
            actor: "urn:li:person:user1",
            object: "urn:li:share:abc123",
            reactionType: "LIKE",
            created: { time: 1700000000000 },
          },
          {
            actor: "urn:li:person:user2",
            object: "urn:li:share:abc123",
            reactionType: "PRAISE",
            created: { time: 1700000001000 },
          },
        ],
      }),
    });

    const reactions = await listReactions(client, { entity: "urn:li:share:abc123" });

    expect(reactions).toEqual([
      {
        actor: "urn:li:person:user1",
        entity: "urn:li:share:abc123",
        reactionType: "LIKE",
        createdAt: 1700000000000,
      },
      {
        actor: "urn:li:person:user2",
        entity: "urn:li:share:abc123",
        reactionType: "PRAISE",
        createdAt: 1700000001000,
      },
    ]);
  });

  it("returns empty array when no reactions exist", async () => {
    const client = mockClient({ request: vi.fn().mockResolvedValue({ elements: [] }) });
    const reactions = await listReactions(client, { entity: "urn:li:share:abc123" });

    expect(reactions).toEqual([]);
  });
});

describe("deleteReaction", () => {
  it("calls client.delete with REST.li compound key path", async () => {
    const client = mockClient();
    await deleteReaction(client, {
      actor: "urn:li:person:user1",
      entity: "urn:li:share:abc123",
    });

    expect(client.delete).toHaveBeenCalledWith(
      "/rest/reactions/(actor:urn%3Ali%3Aperson%3Auser1,entity:urn%3Ali%3Ashare%3Aabc123)",
    );
  });

  it("percent-encodes URN colons in compound key", async () => {
    const client = mockClient();
    await deleteReaction(client, {
      actor: "urn:li:person:abc",
      entity: "urn:li:share:xyz",
    });

    const path = vi.mocked(client.delete).mock.calls[0]?.[0] as string;
    expect(path).not.toContain("urn:li:");
    expect(path).toContain("urn%3Ali%3Aperson%3Aabc");
    expect(path).toContain("urn%3Ali%3Ashare%3Axyz");
  });
});
