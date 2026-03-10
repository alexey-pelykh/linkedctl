// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it, vi } from "vitest";
import { finalizeVideoUpload, initializeVideoUpload, uploadVideo, uploadVideoChunk } from "./video-service.js";
import type { LinkedInClient } from "../http/linkedin-client.js";
import type { InitializeVideoUploadResponse } from "./types.js";

function mockClient(overrides?: Partial<LinkedInClient>): LinkedInClient {
  return {
    request: vi.fn(),
    requestVoid: vi.fn().mockResolvedValue(undefined),
    uploadBinary: vi.fn(),
    ...overrides,
  } as unknown as LinkedInClient;
}

const INIT_RESPONSE: InitializeVideoUploadResponse = {
  value: {
    uploadUrlsExpireAt: Date.now() + 3600_000,
    video: "urn:li:video:C5F10AQGyzL",
    uploadInstructions: [
      { uploadUrl: "https://upload.example.com/chunk/0", firstByte: 0, lastByte: 4_194_303 },
      { uploadUrl: "https://upload.example.com/chunk/1", firstByte: 4_194_304, lastByte: 5_000_000 },
    ],
    uploadToken: "upload-token-abc",
  },
};

describe("initializeVideoUpload", () => {
  it("calls client.request with correct path and body", async () => {
    const client = mockClient({ request: vi.fn().mockResolvedValue(INIT_RESPONSE) });

    const result = await initializeVideoUpload(client, {
      owner: "urn:li:person:abc",
      fileSizeBytes: 5_000_001,
    });

    expect(client.request).toHaveBeenCalledWith("/rest/videos?action=initializeUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: "urn:li:person:abc",
          fileSizeBytes: 5_000_001,
        },
      }),
    });
    expect(result).toEqual(INIT_RESPONSE);
  });
});

describe("uploadVideoChunk", () => {
  it("uploads chunk and returns ETag", async () => {
    const response = new Response(null, {
      status: 200,
      headers: { ETag: '"etag-chunk-0"' },
    });
    const client = mockClient({ uploadBinary: vi.fn().mockResolvedValue(response) });
    const chunk = Buffer.alloc(1024);

    const etag = await uploadVideoChunk(client, "https://upload.example.com/chunk/0", chunk);

    expect(client.uploadBinary).toHaveBeenCalledWith("https://upload.example.com/chunk/0", chunk);
    expect(etag).toBe('"etag-chunk-0"');
  });

  it("throws when ETag header is missing", async () => {
    const response = new Response(null, { status: 200 });
    const client = mockClient({ uploadBinary: vi.fn().mockResolvedValue(response) });

    await expect(uploadVideoChunk(client, "https://upload.example.com/chunk/0", Buffer.alloc(1))).rejects.toThrow(
      /ETag/,
    );
  });
});

describe("finalizeVideoUpload", () => {
  it("calls client.requestVoid with correct path and body", async () => {
    const client = mockClient({ requestVoid: vi.fn().mockResolvedValue(undefined) });

    await finalizeVideoUpload(client, {
      video: "urn:li:video:C5F10AQGyzL",
      uploadToken: "upload-token-abc",
      uploadedPartIds: ['"etag-0"', '"etag-1"'],
    });

    expect(client.requestVoid).toHaveBeenCalledWith("/rest/videos?action=finalizeUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: "urn:li:video:C5F10AQGyzL",
          uploadToken: "upload-token-abc",
          uploadedPartIds: ['"etag-0"', '"etag-1"'],
        },
      }),
    });
  });
});

describe("uploadVideo", () => {
  it("orchestrates initialize, chunk uploads, and finalize", async () => {
    const requestMock = vi.fn().mockResolvedValueOnce(INIT_RESPONSE);
    const requestVoidMock = vi.fn().mockResolvedValueOnce(undefined);

    const uploadBinaryMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { ETag: '"etag-0"' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { ETag: '"etag-1"' } }));

    const client = mockClient({ request: requestMock, requestVoid: requestVoidMock, uploadBinary: uploadBinaryMock });

    const data = Buffer.alloc(5_000_001);
    const videoUrn = await uploadVideo(client, {
      owner: "urn:li:person:abc",
      data,
    });

    expect(videoUrn).toBe("urn:li:video:C5F10AQGyzL");

    // Verify initialize was called
    expect(requestMock).toHaveBeenCalledWith(
      "/rest/videos?action=initializeUpload",
      expect.objectContaining({ method: "POST" }),
    );

    // Verify chunks were uploaded in order
    expect(uploadBinaryMock).toHaveBeenCalledTimes(2);
    const firstChunk = uploadBinaryMock.mock.calls[0]?.[1] as Buffer;
    expect(firstChunk.byteLength).toBe(4_194_304);
    const secondChunk = uploadBinaryMock.mock.calls[1]?.[1] as Buffer;
    expect(secondChunk.byteLength).toBe(805_697);

    // Verify finalize was called with collected ETags
    expect(requestVoidMock).toHaveBeenCalledWith(
      "/rest/videos?action=finalizeUpload",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          finalizeUploadRequest: {
            video: "urn:li:video:C5F10AQGyzL",
            uploadToken: "upload-token-abc",
            uploadedPartIds: ['"etag-0"', '"etag-1"'],
          },
        }),
      }),
    );
  });

  it("handles a single-chunk upload", async () => {
    const singleChunkResponse: InitializeVideoUploadResponse = {
      value: {
        uploadUrlsExpireAt: Date.now() + 3600_000,
        video: "urn:li:video:small",
        uploadInstructions: [{ uploadUrl: "https://upload.example.com/chunk/0", firstByte: 0, lastByte: 999 }],
        uploadToken: "token-small",
      },
    };

    const requestMock = vi.fn().mockResolvedValueOnce(singleChunkResponse);
    const requestVoidMock = vi.fn().mockResolvedValueOnce(undefined);

    const uploadBinaryMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { ETag: '"etag-only"' } }));

    const client = mockClient({ request: requestMock, requestVoid: requestVoidMock, uploadBinary: uploadBinaryMock });

    const data = Buffer.alloc(1000);
    const videoUrn = await uploadVideo(client, {
      owner: "urn:li:person:abc",
      data,
    });

    expect(videoUrn).toBe("urn:li:video:small");
    expect(uploadBinaryMock).toHaveBeenCalledOnce();
  });
});
