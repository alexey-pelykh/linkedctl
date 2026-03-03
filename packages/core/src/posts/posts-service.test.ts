// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { createTextPost } from "./posts-service.js";
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
});
