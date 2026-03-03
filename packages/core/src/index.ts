// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

export {
  getDefaultConfigPath,
  readConfigFile,
  writeConfigFile,
  listProfiles,
  getProfile,
  setProfile,
  deleteProfile,
  setDefaultProfile,
  redactProfile,
  clearProfileCredentials,
} from "./config/config-file.js";
export { getTokenExpiry } from "./auth/token-introspection.js";
export type { TokenExpiry } from "./auth/token-introspection.js";
export { resolveConfig } from "./config/config-resolver.js";
export type { CliOverrides, EnvOverrides } from "./config/config-resolver.js";
export type { ConfigFile, Profile, ResolvedConfig } from "./config/types.js";
export { LinkedInApiError, LinkedInAuthError, LinkedInRateLimitError, LinkedInServerError } from "./http/errors.js";
export { LinkedInClient } from "./http/linkedin-client.js";
export type { LinkedInClientOptions } from "./http/linkedin-client.js";
export { buildAuthorizationUrl, exchangeAuthorizationCode, refreshAccessToken } from "./oauth2/oauth2-client.js";
export type { OAuth2Config, OAuth2TokenResponse } from "./oauth2/types.js";
export { getUserInfo } from "./userinfo/userinfo.js";
export type { UserInfo } from "./userinfo/userinfo.js";
export { getCurrentPersonUrn } from "./userinfo/userinfo-service.js";
export { createTextPost } from "./posts/posts-service.js";
export type { CreateTextPostOptions } from "./posts/posts-service.js";
export type { PostVisibility } from "./posts/types.js";
