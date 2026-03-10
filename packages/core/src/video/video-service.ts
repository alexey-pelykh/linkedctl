// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type {
  FinalizeVideoUploadRequest,
  InitializeVideoUploadRequest,
  InitializeVideoUploadResponse,
  UploadVideoOptions,
} from "./types.js";

/**
 * Initialize a video upload with LinkedIn.
 *
 * Returns the video URN, upload instructions (presigned URLs), and upload token.
 */
export async function initializeVideoUpload(
  client: LinkedInClient,
  options: InitializeVideoUploadRequest,
): Promise<InitializeVideoUploadResponse> {
  return client.request<InitializeVideoUploadResponse>("/rest/videos?action=initializeUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: options.owner,
        fileSizeBytes: options.fileSizeBytes,
      },
    }),
  });
}

/**
 * Upload a single binary chunk to a presigned upload URL.
 *
 * Returns the ETag header from the response.
 */
export async function uploadVideoChunk(client: LinkedInClient, uploadUrl: string, chunk: Buffer): Promise<string> {
  const response = await client.uploadBinary(uploadUrl, chunk);
  const etag = response.headers.get("etag");
  if (etag === null) {
    throw new Error("Upload response missing ETag header");
  }
  return etag;
}

/**
 * Finalize a video upload after all chunks have been uploaded.
 */
export async function finalizeVideoUpload(client: LinkedInClient, options: FinalizeVideoUploadRequest): Promise<void> {
  await client.requestVoid("/rest/videos?action=finalizeUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: options.video,
        uploadToken: options.uploadToken,
        uploadedPartIds: options.uploadedPartIds,
      },
    }),
  });
}

/**
 * Upload a video to LinkedIn via the multipart flow:
 * initialize → chunk upload → finalize.
 *
 * Splits the file into chunks matching the upload instructions,
 * uploads each chunk, collects ETags, and finalizes.
 *
 * Returns the video URN.
 */
export async function uploadVideo(client: LinkedInClient, options: UploadVideoOptions): Promise<string> {
  const { owner, data } = options;

  const initResponse = await initializeVideoUpload(client, {
    owner,
    fileSizeBytes: data.byteLength,
  });

  const { video, uploadInstructions, uploadToken } = initResponse.value;

  const etags: string[] = [];
  for (const instruction of uploadInstructions) {
    const chunk = data.subarray(instruction.firstByte, instruction.lastByte + 1);
    const etag = await uploadVideoChunk(client, instruction.uploadUrl, chunk);
    etags.push(etag);
  }

  await finalizeVideoUpload(client, {
    video,
    uploadToken,
    uploadedPartIds: etags,
  });

  return video;
}
