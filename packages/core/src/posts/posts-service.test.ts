// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { createTextPost, createPost, getPost, listPosts, updatePost, deletePost } from "./posts-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import type { PostData, PostListResponse } from "./types.js";

function mockClient(urn: string): LinkedInClient {
  return {
    create: vi.fn().mockResolvedValue(urn),
    request: vi.fn(),
    requestVoid: vi.fn().mockResolvedValue(undefined),
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

  it("includes poll content for poll post", async () => {
    const client = mockClient("urn:li:share:400");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "What do you think?",
      content: {
        poll: {
          question: "Favorite language?",
          options: [{ text: "TypeScript" }, { text: "Python" }],
          settings: { duration: "THREE_DAYS" },
        },
      },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      poll: {
        question: "Favorite language?",
        options: [{ text: "TypeScript" }, { text: "Python" }],
        settings: { duration: "THREE_DAYS" },
      },
    });
  });

  it("includes poll content with four options", async () => {
    const client = mockClient("urn:li:share:401");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "Pick one",
      content: {
        poll: {
          question: "Best framework?",
          options: [{ text: "React" }, { text: "Vue" }, { text: "Angular" }, { text: "Svelte" }],
          settings: { duration: "ONE_WEEK" },
        },
      },
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("content", {
      poll: {
        question: "Best framework?",
        options: [{ text: "React" }, { text: "Vue" }, { text: "Angular" }, { text: "Svelte" }],
        settings: { duration: "ONE_WEEK" },
      },
    });
  });
});

describe("getPost", () => {
  it("calls client.request with URL-encoded URN", async () => {
    const postData: PostData = {
      id: "urn:li:share:123",
      author: "urn:li:person:abc",
      commentary: "Hello",
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      isReshareDisabledByAuthor: false,
    };
    const client = mockClient("");
    vi.mocked(client.request).mockResolvedValue(postData);

    const result = await getPost(client, "urn:li:share:123");

    expect(client.request).toHaveBeenCalledWith("/rest/posts/urn%3Ali%3Ashare%3A123");
    expect(result).toEqual(postData);
  });
});

describe("listPosts", () => {
  it("calls client.request with author query and default pagination", async () => {
    const response: PostListResponse = {
      elements: [],
      paging: { count: 10, start: 0 },
    };
    const client = mockClient("");
    vi.mocked(client.request).mockResolvedValue(response);

    const result = await listPosts(client, { author: "urn:li:person:abc" });

    expect(client.request).toHaveBeenCalledWith("/rest/posts?q=author&author=urn%3Ali%3Aperson%3Aabc&count=10&start=0");
    expect(result).toEqual(response);
  });

  it("uses custom count and start values", async () => {
    const response: PostListResponse = {
      elements: [],
      paging: { count: 5, start: 10 },
    };
    const client = mockClient("");
    vi.mocked(client.request).mockResolvedValue(response);

    await listPosts(client, { author: "urn:li:person:abc", count: 5, start: 10 });

    expect(client.request).toHaveBeenCalledWith("/rest/posts?q=author&author=urn%3Ali%3Aperson%3Aabc&count=5&start=10");
  });
});

describe("createPost REST.li escaping", () => {
  it("escapes REST.li reserved characters in commentary", async () => {
    const client = mockClient("urn:li:share:500");
    await createPost(client, {
      author: "urn:li:person:abc",
      text: "129 of them (18%) hit the error",
    });

    const call = vi.mocked(client.create).mock.calls[0];
    expect(call?.[1]).toHaveProperty("commentary", "129 of them \\(18%\\) hit the error");
  });
});

describe("updatePost", () => {
  it("sends PARTIAL_UPDATE with commentary patch", async () => {
    const client = mockClient("");

    await updatePost(client, "urn:li:share:123", { text: "Updated text" });

    expect(client.requestVoid).toHaveBeenCalledWith("/rest/posts/urn%3Ali%3Ashare%3A123", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RestLi-Method": "PARTIAL_UPDATE",
      },
      body: JSON.stringify({
        patch: {
          $set: {
            commentary: "Updated text",
          },
        },
      }),
    });
  });

  it("escapes REST.li reserved characters in commentary", async () => {
    const client = mockClient("");

    await updatePost(client, "urn:li:share:123", { text: "text (with parens) here" });

    const body = JSON.parse(vi.mocked(client.requestVoid).mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect((body["patch"] as Record<string, Record<string, string>>)["$set"]?.["commentary"]).toBe(
      "text \\(with parens\\) here",
    );
  });
});

describe("deletePost", () => {
  it("sends DELETE request with URL-encoded URN", async () => {
    const client = mockClient("");

    await deletePost(client, "urn:li:share:123");

    expect(client.requestVoid).toHaveBeenCalledWith("/rest/posts/urn%3Ali%3Ashare%3A123", {
      method: "DELETE",
    });
  });
});
