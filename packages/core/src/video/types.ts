// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Request payload for the LinkedIn video initializeUpload action.
 */
export interface InitializeVideoUploadRequest {
  /** Owner URN (e.g. `urn:li:person:abc123`). */
  owner: string;
  /** Total file size in bytes. */
  fileSizeBytes: number;
}

/**
 * A single upload instruction returned by initializeUpload.
 */
export interface VideoUploadInstruction {
  /** Presigned URL to upload the chunk to via PUT. */
  uploadUrl: string;
  /** Byte offset of the first byte in this chunk (inclusive). */
  firstByte: number;
  /** Byte offset of the last byte in this chunk (inclusive). */
  lastByte: number;
}

/**
 * Response from the LinkedIn video initializeUpload action.
 */
export interface InitializeVideoUploadResponse {
  value: {
    /** Expiration timestamp for the upload URLs. */
    uploadUrlsExpireAt: number;
    /** The video URN assigned to this upload. */
    video: string;
    /** Ordered list of chunk upload instructions. */
    uploadInstructions: VideoUploadInstruction[];
    /** Token required for the finalizeUpload call. */
    uploadToken: string;
  };
}

/**
 * Request payload for the LinkedIn video finalizeUpload action.
 */
export interface FinalizeVideoUploadRequest {
  /** The video URN from initializeUpload. */
  video: string;
  /** The upload token from initializeUpload. */
  uploadToken: string;
  /** ETags collected from each chunk upload, in order. */
  uploadedPartIds: string[];
}

/**
 * Options for the high-level uploadVideo function.
 */
export interface UploadVideoOptions {
  /** Owner URN (e.g. `urn:li:person:abc123`). */
  owner: string;
  /** Raw video file data. */
  data: Buffer;
}
