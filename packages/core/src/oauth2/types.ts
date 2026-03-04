// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Configuration required to initiate an OAuth2 flow with LinkedIn.
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string | undefined;
}

/**
 * Token response from the LinkedIn OAuth2 token endpoint.
 */
export interface OAuth2TokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string | undefined;
  refreshTokenExpiresIn?: number | undefined;
  scope: string;
}
