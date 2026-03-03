// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import type { LinkedInClient } from "../http/linkedin-client.js";

/**
 * OpenID Connect userinfo response from LinkedIn.
 */
export interface UserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale?: { country: string; language: string } | undefined;
}

/**
 * Retrieve the authenticated user's profile via the OpenID Connect userinfo endpoint.
 */
export async function getUserInfo(client: LinkedInClient): Promise<UserInfo> {
  return client.request<UserInfo>("/v2/userinfo");
}
