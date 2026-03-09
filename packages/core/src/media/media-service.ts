// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";

/**
 * Options for uploading an image to LinkedIn.
 */
export interface UploadImageOptions {
  /** Owner URN (e.g. `urn:li:person:abc123`). */
  owner: string;
  /** Raw image bytes. */
  data: Uint8Array;
  /** MIME type of the image (e.g. `image/jpeg`). */
  contentType: string;
}

interface InitializeUploadResponse {
  value: {
    uploadUrl: string;
    image: string;
  };
}

/**
 * Upload an image to LinkedIn and return the image URN.
 *
 * Uses the LinkedIn Images API two-step flow:
 * 1. Initialize the upload to get an upload URL and image URN
 * 2. PUT the binary data to the upload URL
 */
export async function uploadImage(client: LinkedInClient, options: UploadImageOptions): Promise<string> {
  const initResponse = await client.request<InitializeUploadResponse>("/rest/images?action=initializeUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: options.owner,
      },
    }),
  });

  const { uploadUrl, image } = initResponse.value;

  await client.upload(uploadUrl, options.data, options.contentType);

  return image;
}
