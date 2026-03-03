// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { getCurrentPersonUrn } from "./userinfo-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(sub: string): LinkedInClient {
  return {
    request: vi.fn().mockResolvedValue({ sub }),
  } as unknown as LinkedInClient;
}

describe("getCurrentPersonUrn", () => {
  it("returns person URN from userinfo sub", async () => {
    const client = mockClient("abc123");
    const urn = await getCurrentPersonUrn(client);

    expect(urn).toBe("urn:li:person:abc123");
    expect(client.request).toHaveBeenCalledWith("/v2/userinfo");
  });

  it("handles alphanumeric sub values", async () => {
    const client = mockClient("5abc_dEfgH");
    const urn = await getCurrentPersonUrn(client);

    expect(urn).toBe("urn:li:person:5abc_dEfgH");
  });
});
