// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

export {
  loadConfigFile,
  CONFIG_DIR,
  validateConfig,
  isValidProfileName,
  applyEnvOverlay,
  saveOAuthTokens,
  saveOAuthClientCredentials,
  clearOAuthTokens,
  resolveConfig,
  ConfigError,
} from "./config/index.js";
export type {
  OAuthCredentials,
  LinkedctlConfig,
  ConfigResult,
  ResolveOptions,
  LoadResult,
  ValidationResult,
} from "./config/index.js";
export { getTokenExpiry } from "./auth/token-introspection.js";
export type { TokenExpiry } from "./auth/token-introspection.js";
export { LinkedInApiError, LinkedInAuthError, LinkedInRateLimitError, LinkedInServerError } from "./http/errors.js";
export { LinkedInClient } from "./http/linkedin-client.js";
export type { LinkedInClientOptions } from "./http/linkedin-client.js";
export {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  revokeAccessToken,
} from "./oauth2/oauth2-client.js";
export { generateCodeVerifier, computeCodeChallenge } from "./oauth2/pkce.js";
export type { OAuth2Config, OAuth2TokenResponse } from "./oauth2/types.js";
export { getUserInfo } from "./userinfo/userinfo.js";
export type { UserInfo } from "./userinfo/userinfo.js";
export { getCurrentPersonUrn } from "./userinfo/userinfo-service.js";
export { createTextPost } from "./posts/posts-service.js";
export type { CreateTextPostOptions } from "./posts/posts-service.js";
export type { PostVisibility } from "./posts/types.js";
