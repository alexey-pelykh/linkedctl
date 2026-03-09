// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";
import type { InitializeDocumentUploadResponse, UploadDocumentOptions } from "./types.js";

/**
 * Upload a document to LinkedIn and return the document URN.
 *
 * Uses the two-step LinkedIn upload flow:
 * 1. Initialize the upload to obtain an upload URL and document URN.
 * 2. PUT the binary content to the upload URL.
 */
export async function uploadDocument(client: LinkedInClient, options: UploadDocumentOptions): Promise<string> {
  const initResponse = await client.action<InitializeDocumentUploadResponse>(
    "/rest/documents?action=initializeUpload",
    {
      initializeUploadRequest: {
        owner: options.owner,
      },
    },
  );

  await client.upload(initResponse.value.uploadUrl, options.data);

  return initResponse.value.document;
}
