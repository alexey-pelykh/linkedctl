// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";

interface UserInfoResponse {
  sub: string;
}

/**
 * Fetch the current authenticated user's person URN via the OpenID
 * Connect `/v2/userinfo` endpoint.
 */
export async function getCurrentPersonUrn(client: LinkedInClient): Promise<string> {
  const info = await client.request<UserInfoResponse>("/v2/userinfo");
  return `urn:li:person:${info.sub}`;
}
