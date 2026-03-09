// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Supported document file extensions for LinkedIn document upload.
 */
export const DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".pptx", ".doc", ".ppt"] as const;

/**
 * Maximum document file size in bytes (100 MB).
 */
export const DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Options for uploading a document to LinkedIn.
 */
export interface UploadDocumentOptions {
  /** Author URN (e.g. `urn:li:person:abc123`). */
  owner: string;
  /** Raw file content. */
  data: Uint8Array;
}

/**
 * Response from the LinkedIn `initializeUpload` action for documents.
 */
export interface InitializeDocumentUploadResponse {
  value: {
    uploadUrl: string;
    document: string;
  };
}
