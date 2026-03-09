// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { uploadDocument } from "./documents-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(uploadUrl: string, documentUrn: string): LinkedInClient {
  return {
    action: vi.fn().mockResolvedValue({
      value: { uploadUrl, document: documentUrn },
    }),
    upload: vi.fn().mockResolvedValue(undefined),
  } as unknown as LinkedInClient;
}

describe("uploadDocument", () => {
  it("initializes upload with correct path and body", async () => {
    const client = mockClient("https://upload.example.com/doc", "urn:li:document:D123");
    const data = new Uint8Array([1, 2, 3]);
    await uploadDocument(client, { owner: "urn:li:person:abc", data });

    expect(client.action).toHaveBeenCalledWith("/rest/documents?action=initializeUpload", {
      initializeUploadRequest: {
        owner: "urn:li:person:abc",
      },
    });
  });

  it("uploads binary data to the upload URL", async () => {
    const client = mockClient("https://upload.example.com/doc", "urn:li:document:D123");
    const data = new Uint8Array([1, 2, 3]);
    await uploadDocument(client, { owner: "urn:li:person:abc", data });

    expect(client.upload).toHaveBeenCalledWith("https://upload.example.com/doc", data);
  });

  it("returns the document URN", async () => {
    const client = mockClient("https://upload.example.com/doc", "urn:li:document:D456");
    const data = new Uint8Array([4, 5, 6]);
    const urn = await uploadDocument(client, { owner: "urn:li:person:abc", data });

    expect(urn).toBe("urn:li:document:D456");
  });
});
