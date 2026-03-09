// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * The role an authenticated member holds in an organization.
 */
export type OrganizationRole = "ADMINISTRATOR";

/**
 * The state of a role assignment.
 */
export type OrganizationRoleAssigneeState = "APPROVED";

/**
 * An organization role assignment (ACL entry) as returned by the API.
 */
export interface OrganizationAcl {
  /** Organization URN (e.g. `urn:li:organization:123`). */
  organization: string;
  /** Role held by the member. */
  role: OrganizationRole;
  /** State of the role assignment. */
  state: OrganizationRoleAssigneeState;
}

/**
 * Paginated response from the organizationAcls endpoint.
 */
export interface OrganizationAclListResponse {
  /** Array of organization ACL entries. */
  elements: OrganizationAcl[];
  /** Paging metadata. */
  paging: {
    /** Number of results returned. */
    count: number;
    /** Starting index. */
    start: number;
    /** Total number of results available. */
    total?: number | undefined;
  };
}

/**
 * An organization as returned by the LinkedIn API.
 */
export interface OrganizationData {
  /** Organization ID (numeric). */
  id: number;
  /** Localized organization name. */
  localizedName: string;
  /** Localized description. */
  localizedDescription?: string | undefined;
  /** Localized website URL. */
  localizedWebsite?: string | undefined;
  /** Vanity name (URL slug). */
  vanityName?: string | undefined;
  /** Organization logo URN. */
  logoV2?: { original: string } | undefined;
}

/**
 * Follower count response from the networkSizes endpoint.
 */
export interface OrganizationFollowerCountResponse {
  /** First-degree network size (follower count). */
  firstDegreeSize: number;
}
