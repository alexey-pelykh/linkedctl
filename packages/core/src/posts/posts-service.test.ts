// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { createTextPost, createPost } from "./posts-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(urn: string): LinkedInClient {
  return {
    create: vi.fn().mockResolvedValue(urn),
  } as unknown as LinkedInClient;
}

describe("createTextPost", () => {
  it("calls client.create with correct path and body", async () => {
    const client = mockClient("urn:li:share:123");
    await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Hello LinkedIn",
    });

    expect(client.create).toHaveBeenCalledWith("/rest/posts", {
      author: "urn:li:person:abc",
      commentary: "Hello LinkedIn",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    });
  });

  it("returns the post URN from create", async () => {
    const client = mockClient("urn:li:share:456");
    const urn = await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Test post",
    });

    expect(urn).toBe("urn:li:share:456");
  });

  it("defaults visibility to PUBLIC", async () => {
    const client = mockClient("urn:li:share:789");
    await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Default visibility",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("visibility", "PUBLIC");
  });

  it("uses CONNECTIONS visibility when specified", async () => {
    const client = mockClient("urn:li:share:101");
    await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Connections only",
      visibility: "CONNECTIONS",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("visibility", "CONNECTIONS");
  });

  it("defaults lifecycleState to PUBLISHED", async () => {
    const client = mockClient("urn:li:share:102");
    await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Default state",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("lifecycleState", "PUBLISHED");
  });

  it("uses DRAFT lifecycleState when specified", async () => {
    const client = mockClient("urn:li:share:103");
    await createTextPost(client, {
      author: "urn:li:person:abc",
      text: "Draft post",
      lifecycleState: "DRAFT",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("lifecycleState", "DRAFT");
  });
});

describe("createPost", () => {
  it("creates a text-only post when no content is provided", async () => {
    const client = mockClient("urn:li:share:200");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Text only",
    });

    expect(client.create).toHaveBeenCalledWith("/rest/posts", {
      author: "urn:li:person:abc",
      commentary: "Text only",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    });
  });

  it("does not include content key when content is undefined", async () => {
    const client = mockClient("urn:li:share:201");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "No content",
      content: undefined,
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).not.toHaveProperty("content");
  });

  it("includes media content for image post", async () => {
    const client = mockClient("urn:li:share:300");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Check this image",
      content: { media: { id: "urn:li:image:C5608AQ123" } },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      media: { id: "urn:li:image:C5608AQ123" },
    });
  });

  it("includes media content for video post", async () => {
    const client = mockClient("urn:li:share:301");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Watch this video",
      content: { media: { id: "urn:li:video:D5608AQ456" } },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      media: { id: "urn:li:video:D5608AQ456" },
    });
  });

  it("includes media content for document post", async () => {
    const client = mockClient("urn:li:share:302");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Read this document",
      content: { media: { id: "urn:li:document:D789" } },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      media: { id: "urn:li:document:D789" },
    });
  });

  it("includes article content for article post", async () => {
    const client = mockClient("urn:li:share:303");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Great article",
      content: { article: { source: "https://example.com/article" } },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      article: { source: "https://example.com/article" },
    });
  });

  it("includes multiImage content for multi-image post", async () => {
    const client = mockClient("urn:li:share:304");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Photo gallery",
      content: {
        multiImage: {
          images: [{ id: "urn:li:image:A1" }, { id: "urn:li:image:A2" }, { id: "urn:li:image:A3" }],
        },
      },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      multiImage: {
        images: [{ id: "urn:li:image:A1" }, { id: "urn:li:image:A2" }, { id: "urn:li:image:A3" }],
      },
    });
  });

  it("returns the post URN", async () => {
    const client = mockClient("urn:li:share:305");
    const urn = await createPost(client, {
      author: "urn:li:person:abc",
      text: "With image",
      content: { media: { id: "urn:li:image:X" } },
    });

    expect(urn).toBe("urn:li:share:305");
  });

  it("uses specified visibility with content", async () => {
    const client = mockClient("urn:li:share:306");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Private image post",
      visibility: "CONNECTIONS",
      content: { media: { id: "urn:li:image:X" } },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("visibility", "CONNECTIONS");
    expect(call?.[1]).toHaveProperty("content", { media: { id: "urn:li:image:X" } });
  });

  it("defaults lifecycleState to PUBLISHED", async () => {
    const client = mockClient("urn:li:share:307");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Default state",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("lifecycleState", "PUBLISHED");
  });

  it("uses DRAFT lifecycleState when specified", async () => {
    const client = mockClient("urn:li:share:308");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Draft post",
      lifecycleState: "DRAFT",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("lifecycleState", "DRAFT");
  });

  it("uses DRAFT lifecycleState with content", async () => {
    const client = mockClient("urn:li:share:309");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Draft with image",
      content: { media: { id: "urn:li:image:X" } },
      lifecycleState: "DRAFT",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("lifecycleState", "DRAFT");
    expect(call?.[1]).toHaveProperty("content", { media: { id: "urn:li:image:X" } });
  });
});
