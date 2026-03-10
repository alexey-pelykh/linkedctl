# linkedctl MCP — Tool Surface & Workflow Guide

This skill teaches linkedctl MCP workflow patterns, conventions, and error handling for managing LinkedIn content via the LinkedIn API.

## Prerequisites

A valid LinkedIn OAuth2 access token is required. Configure it via:
- Environment variable: `LINKEDCTL_ACCESS_TOKEN`
- Config file: `~/.linkedctl.yaml` (or per-profile configs in `~/.linkedctl/`)

Optional: `LINKEDCTL_CLIENT_ID` and `LINKEDCTL_CLIENT_SECRET` for token refresh.

## Tool Discovery

Tools are autodiscovered via the MCP protocol handshake (`tools/list`). Use the MCP tool listing to see available tools and their parameters.

## Workflow Patterns

### Authentication Flow

Always start here to verify credentials:

```
whoami → auth_status
```

1. **`whoami`** — Verify identity and token validity
2. **`auth_status`** — Check token expiry and scopes

If the token is expired or revoked, re-authenticate. Use `auth_revoke` to clear local credentials.

### Post Creation & Management

Full workflow for creating and managing posts:

```
whoami → post_create → post_list / post_get → post_update → post_delete
```

**Creating a post:**

`post_create` supports:
- **Text-only**: Just `commentary` text
- **With image**: Provide `image_path` (local file) or `image_urn` (pre-uploaded)
- **With video**: Provide `video_path` (local file) or `video_urn` (pre-uploaded)
- **With document**: Provide `document_urn` (pre-uploaded via `document_upload`)
- **With poll**: Provide `poll_question` + `poll_options` (2-4 options, optional `poll_duration`)
- **With article**: Provide `article_url` + optional `article_title` / `article_description`
- **As organization**: Set `as_org` to an organization ID to post on behalf of a company page
- **Visibility**: `PUBLIC` (default) or `CONNECTIONS`

**Listing posts:**

`post_list` returns paginated posts. Use `count` (default: 10) and `start` for pagination. Filter by `lifecycle_state` (PUBLISHED, DRAFT).

### Media Uploads

Upload media before attaching to posts:

```
document_upload → post_create (with document_urn)
```

- **Images/Videos**: Use `post_create` directly with `image_path` / `video_path` for combined upload+post
- **Documents**: Must be uploaded separately first with `document_upload`, then reference the URN in `post_create`

Supported document types: PDF, DOCX, PPTX, DOC, PPT (max 100 MB).

### Engagement

**Reactions:**

```
reaction_create → reaction_list → reaction_delete
```

- `reaction_create` — Add a reaction (LIKE, PRAISE, EMPATHY, INTEREST, APPRECIATION, ENTERTAINMENT)
- Use `as_org` to react as an organization
- `reaction_list` — List reactions on a post
- `reaction_delete` — Remove a reaction

**Comments:**

```
comment_create → comment_list → comment_get → comment_delete
```

- `comment_create` — Comment on a post (use `as_org` for organization comments)
- `comment_list` — List comments on a post
- `comment_get` / `comment_delete` — Manage specific comments

### Organization Management

```
org_list → org_get → org_followers
```

- `org_list` — List organizations you administer
- `org_get` — Get organization details by ID
- `org_followers` — Get follower count for an organization

### Analytics

```
stats_post / stats_me / stats_org
```

- **`stats_post`** — Analytics for a single post (impressions, reach, reactions, comments, reshares)
- **`stats_me`** — Aggregated analytics across all your posts (with optional date range)
- **`stats_org`** — Share statistics for an organization (lifetime or date-ranged)

All analytics tools require the Community Management API product.

## Parameter Conventions

- **`profile`**: Optional on all tools, selects a named profile from `~/.linkedctl/`. Defaults to the default profile.
- **`as_org`**: Organization ID for acting on behalf of a company page (posting, reacting, commenting).
- **`urn`** / **`post_urn`**: LinkedIn URN identifiers (e.g., `urn:li:share:123456`).
- **`visibility`**: Post visibility — `PUBLIC` (default) or `CONNECTIONS`.
- **`count`** / **`start`**: Pagination parameters for list operations.

## Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| "Authentication failed" | Invalid or expired token | Re-authenticate, check `auth_status` |
| "NOT_FOUND" | Invalid URN or deleted resource | Verify URN with `post_list` or `comment_list` |
| "ACCESS_DENIED" | Missing API scope or permission | Check required scopes for the operation |
| "RATE_LIMITED" | Too many API requests | Wait and retry (check `retry-after` hint) |
| "VALIDATION_ERROR" | Invalid input parameters | Check parameter formats and constraints |

## Tool Reference

| Tool | Category | Purpose |
|------|----------|---------|
| `whoami` | auth | Show current user identity |
| `auth_status` | auth | Check token status and expiry |
| `auth_revoke` | auth | Revoke token and clear credentials |
| `post_create` | posts | Create a post with optional media |
| `post_get` | posts | Fetch a single post by URN |
| `post_list` | posts | List posts with pagination |
| `post_update` | posts | Update post commentary |
| `post_delete` | posts | Delete a post |
| `document_upload` | media | Upload a document (PDF, DOCX, etc.) |
| `comment_create` | engagement | Comment on a post |
| `comment_list` | engagement | List comments on a post |
| `comment_get` | engagement | Get a specific comment |
| `comment_delete` | engagement | Delete a comment |
| `reaction_create` | engagement | Add a reaction to a post |
| `reaction_list` | engagement | List reactions on a post |
| `reaction_delete` | engagement | Remove a reaction |
| `org_list` | organizations | List administered organizations |
| `org_get` | organizations | Get organization details |
| `org_followers` | organizations | Get organization follower count |
| `stats_post` | analytics | Post-level analytics |
| `stats_me` | analytics | Aggregated personal analytics |
| `stats_org` | analytics | Organization share statistics |
