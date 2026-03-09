// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { uploadImage } from "./media-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";

function mockClient(imageUrn: string, uploadUrl: string): LinkedInClient {
  return {
    request: vi.fn().mockResolvedValue({
      value: {
        uploadUrl,
        image: imageUrn,
      },
    }),
    upload: vi.fn().mockResolvedValue(undefined),
  } as unknown as LinkedInClient;
}

describe("uploadImage", () => {
  const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

  it("initializes upload and uploads binary data", async () => {
    const client = mockClient("urn:li:image:abc123", "https://www.linkedin.com/dms-uploads/abc");
    await uploadImage(client, {
      owner: "urn:li:person:person123",
      data: imageData,
      contentType: "image/jpeg",
    });

    expect(client.request).toHaveBeenCalledWith(
      "/rest/images?action=initializeUpload",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: "urn:li:person:person123",
          },
        }),
      }),
    );

    expect(client.upload).toHaveBeenCalledWith("https://www.linkedin.com/dms-uploads/abc", imageData, "image/jpeg");
  });

  it("returns the image URN", async () => {
    const client = mockClient("urn:li:image:xyz789", "https://www.linkedin.com/dms-uploads/xyz");
    const urn = await uploadImage(client, {
      owner: "urn:li:person:person123",
      data: imageData,
      contentType: "image/png",
    });

    expect(urn).toBe("urn:li:image:xyz789");
  });
});
