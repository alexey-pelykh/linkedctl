// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

export {
  loadConfigFile,
  CONFIG_DIR,
  DEFAULT_API_VERSION,
  validateConfig,
  isValidProfileName,
  applyEnvOverlay,
  saveOAuthTokens,
  saveOAuthClientCredentials,
  saveOAuthScope,
  saveOAuthPkce,
  saveApiVersion,
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
export {
  LinkedInApiError,
  LinkedInAuthError,
  LinkedInRateLimitError,
  LinkedInServerError,
  LinkedInUpgradeRequiredError,
} from "./http/errors.js";
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
export { uploadImage } from "./media/media-service.js";
export type { UploadImageOptions } from "./media/media-service.js";
export { SUPPORTED_IMAGE_TYPES } from "./media/types.js";
export { createTextPost, createPost, getPost, listPosts, updatePost, deletePost } from "./posts/posts-service.js";
export type {
  CreateTextPostOptions,
  CreatePostOptions,
  ListPostsOptions,
  UpdatePostOptions,
} from "./posts/posts-service.js";
export type {
  PostVisibility,
  PostLifecycleState,
  PostContent,
  MediaContent,
  ArticleContent,
  MultiImageContent,
  PollDuration,
  PollContent,
  PostData,
  PostListResponse,
  PostDistribution,
} from "./posts/types.js";
export { initializeVideoUpload, uploadVideoChunk, finalizeVideoUpload, uploadVideo } from "./video/video-service.js";
export type {
  InitializeVideoUploadRequest,
  InitializeVideoUploadResponse,
  VideoUploadInstruction,
  FinalizeVideoUploadRequest,
  UploadVideoOptions,
} from "./video/types.js";
export { uploadDocument } from "./documents/documents-service.js";
export { DOCUMENT_EXTENSIONS, DOCUMENT_MAX_SIZE_BYTES } from "./documents/types.js";
export type { UploadDocumentOptions, InitializeDocumentUploadResponse } from "./documents/types.js";
export {
  listOrganizations,
  getOrganization,
  getOrganizationFollowerCount,
} from "./organizations/organizations-service.js";
export type { ListOrganizationsOptions } from "./organizations/organizations-service.js";
export type {
  OrganizationRole,
  OrganizationRoleAssigneeState,
  OrganizationAcl,
  OrganizationAclListResponse,
  OrganizationData,
  OrganizationFollowerCountResponse,
} from "./organizations/types.js";
export { createReaction, listReactions, deleteReaction } from "./reactions/reactions-service.js";
export { REACTION_TYPES } from "./reactions/types.js";
export type {
  ReactionType,
  Reaction,
  CreateReactionOptions,
  ListReactionsOptions,
  DeleteReactionOptions,
} from "./reactions/types.js";
export { createComment, listComments, getComment, deleteComment } from "./comments/comments-service.js";
export type {
  CreateCommentOptions,
  ListCommentsOptions,
  GetCommentOptions,
  DeleteCommentOptions,
} from "./comments/comments-service.js";
export type { Comment } from "./comments/types.js";
export { getPostAnalytics, getMemberAnalytics } from "./member-stats/member-stats-service.js";
export type { GetPostAnalyticsOptions, GetMemberAnalyticsOptions } from "./member-stats/member-stats-service.js";
export { ANALYTICS_METRIC_TYPES } from "./member-stats/types.js";
export type {
  AnalyticsMetricType,
  AnalyticsAggregation,
  AnalyticsDate,
  AnalyticsDateRange,
  AnalyticsDataPoint,
  MetricSuccess,
  MetricUnavailable,
  MetricExcluded,
  MetricResult,
  PostAnalytics,
} from "./member-stats/types.js";
export { getOrgStats } from "./org-stats/org-stats-service.js";
export type { GetOrgStatsOptions } from "./org-stats/org-stats-service.js";
export type {
  OrgStatsTimeGranularity,
  TimeRange,
  ShareStatistics,
  OrgStatsElement,
  OrgStatsResponse,
} from "./org-stats/types.js";
