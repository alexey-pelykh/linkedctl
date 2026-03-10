![LinkedCtl: The Complete CLI & MCP for LinkedIn](https://raw.githubusercontent.com/linkedctl/.github/main/profile/assets/social-preview.png)

[![CI](https://img.shields.io/github/check-runs/alexey-pelykh/linkedctl/main)](https://github.com/alexey-pelykh/linkedctl/actions/workflows/ci.yml)
[![CodeQL](https://github.com/alexey-pelykh/linkedctl/actions/workflows/codeql.yml/badge.svg)](https://github.com/alexey-pelykh/linkedctl/actions/workflows/codeql.yml)
[![License](https://img.shields.io/github/license/alexey-pelykh/linkedctl)](https://www.gnu.org/licenses/agpl-3.0.txt)

OAuth2 CLI and MCP server for the [LinkedIn](https://www.linkedin.com) API.

## What It Does

- **Post content** — text, images, video, documents, articles, multi-image carousels, and polls
- **Comments & reactions** — create, list, and delete comments and reactions on posts
- **Organization support** — post, comment, react, and view analytics as an organization
- **Analytics** — per-post, per-member, and per-organization statistics
- **Media uploads** — upload images, video, and documents to LinkedIn
- **Draft posts** — save posts as drafts before publishing
- **OAuth 2.0 authentication** with your own LinkedIn app
- **Direct token passing** for tokens obtained from other applications
- **MCP server** for AI assistant integration (Claude, Cursor, etc.)
- **CLI** for scriptable LinkedIn operations

## Prerequisites

- [Node.js](https://nodejs.org) >= 24
- A [LinkedIn Developer App](https://www.linkedin.com/developers/apps) with appropriate permissions

## Installation

```sh
npm install -g linkedctl
```

Or run directly:

```sh
npx linkedctl --help
```

## Quick Start

1. Create a LinkedIn app at [linkedin.com/developers](https://www.linkedin.com/developers/apps)
2. Configure OAuth 2.0 credentials
3. Authenticate:
    ```sh
    linkedctl auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
    ```
4. Start using:
    ```sh
    linkedctl post "Hello from LinkedCtl!"
    ```

See the [OAuth Setup Guide](https://github.com/alexey-pelykh/linkedctl/blob/main/docs/oauth-setup.md) for detailed step-by-step instructions.

## MCP Integration

### MCP Client Configuration

<details>
<summary><b>Claude Desktop</b></summary>

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
    "mcpServers": {
        "linkedctl": {
            "command": "npx",
            "args": ["linkedctl", "mcp"]
        }
    }
}
```

</details>

<details>
<summary><b>Claude Code</b></summary>

```sh
claude mcp add linkedctl -- npx linkedctl mcp
```

</details>

<details>
<summary><b>Cursor</b></summary>

Add to `.cursor/mcp.json` in your project root:

```json
{
    "mcpServers": {
        "linkedctl": {
            "command": "npx",
            "args": ["linkedctl", "mcp"]
        }
    }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
    "mcpServers": {
        "linkedctl": {
            "command": "npx",
            "args": ["linkedctl", "mcp"]
        }
    }
}
```

</details>

### Available Tools

All tools accept an optional `profile` parameter to select a configuration profile.

#### Authentication

| Tool          | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `whoami`      | Show the current user's name, email, and profile picture URL    |
| `auth_status` | Show authentication status for a profile                        |
| `auth_revoke` | Revoke the access token server-side and clear local credentials |

#### Posts

| Tool          | Description                                                                |
| ------------- | -------------------------------------------------------------------------- |
| `post_create` | Create a post on LinkedIn with optional media, poll, or article attachment |
| `post_get`    | Fetch a single post by URN                                                 |
| `post_list`   | List posts with pagination (supports `as_org` for organization posts)      |
| `post_update` | Update the commentary text of an existing post                             |
| `post_delete` | Delete a post by URN                                                       |

`post_create` supports rich content types:

| Parameter                    | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| `text`                       | Post text content (required)                          |
| `visibility`                 | `PUBLIC` or `CONNECTIONS` (default `PUBLIC`)          |
| `draft`                      | Save as draft instead of publishing                   |
| `image` / `image_file`       | Attach a single image (URN or local file path)        |
| `video` / `video_file`       | Attach a video (URN or local file path)               |
| `document` / `document_file` | Attach a document (URN or local file path)            |
| `images` / `image_files`     | Attach multiple images (minimum 2)                    |
| `article_url`                | Attach an article link                                |
| `poll`                       | Poll question text                                    |
| `poll_options`               | Poll answer options (2–4 required when `poll` is set) |
| `poll_duration`              | `ONE_DAY`, `THREE_DAYS`, `ONE_WEEK`, or `TWO_WEEKS`   |
| `as_org`                     | Post as an organization (numeric ID)                  |

#### Comments

| Tool             | Description                                    |
| ---------------- | ---------------------------------------------- |
| `comment_create` | Create a comment on a post (supports `as_org`) |
| `comment_list`   | List comments on a post                        |
| `comment_get`    | Get a specific comment by URN                  |
| `comment_delete` | Delete a comment by URN                        |

#### Reactions

| Tool              | Description                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `reaction_create` | Add a reaction to a post (supports `as_org`). Types: `LIKE`, `PRAISE`, `EMPATHY`, `INTEREST`, `APPRECIATION`, `ENTERTAINMENT` |
| `reaction_list`   | List reactions on a post                                                                                                      |
| `reaction_delete` | Remove a reaction from a post (supports `as_org`)                                                                             |

#### Organizations

| Tool            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `org_list`      | List organizations the authenticated user administers |
| `org_get`       | Fetch a single organization by ID                     |
| `org_followers` | Get the follower count for an organization            |

#### Analytics

| Tool         | Description                                                                         |
| ------------ | ----------------------------------------------------------------------------------- |
| `stats_post` | Get analytics for a single post (impressions, reach, reactions, comments, reshares) |
| `stats_me`   | Get aggregated analytics across all your posts                                      |
| `stats_org`  | Get share statistics for an organization (lifetime or time-bucketed)                |

#### Media

| Tool              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `document_upload` | Upload a document to LinkedIn (PDF, DOCX, PPTX, DOC, PPT; max 100 MB) |

## Configuration

### Config File Format

LinkedCtl stores configuration in YAML files. Each file represents a single profile:

```yaml
api-version: "202601"
oauth:
    client-id: "YOUR_CLIENT_ID"
    client-secret: "YOUR_CLIENT_SECRET"
    access-token: "YOUR_ACCESS_TOKEN"
    refresh-token: "YOUR_REFRESH_TOKEN"
    token-expires-at: "2026-05-03T12:00:00.000Z"
```

**Available keys:**

| Key                      | Description                           |
| ------------------------ | ------------------------------------- |
| `api-version`            | LinkedIn API version (e.g. `202601`)  |
| `oauth.client-id`        | OAuth 2.0 client ID                   |
| `oauth.client-secret`    | OAuth 2.0 client secret               |
| `oauth.access-token`     | OAuth 2.0 access token                |
| `oauth.refresh-token`    | OAuth 2.0 refresh token               |
| `oauth.token-expires-at` | Token expiration timestamp (ISO 8601) |

Config files are written with `0600` permissions (owner read/write only).

### File Location and Precedence

Without a profile, LinkedCtl searches for config files in this order:

1. `.linkedctl.yaml` in the current working directory
2. `~/.linkedctl.yaml` in the home directory

The first file found is used. When writing (e.g. after `auth login`), LinkedCtl writes to the CWD file if it exists, otherwise to the home directory file.

### Profiles

Profiles let you manage multiple LinkedIn accounts or configurations. Each profile is stored as a separate YAML file under `~/.linkedctl/`:

| Profile    | Config file path             |
| ---------- | ---------------------------- |
| (default)  | `~/.linkedctl.yaml`          |
| `work`     | `~/.linkedctl/work.yaml`     |
| `personal` | `~/.linkedctl/personal.yaml` |

Use the `--profile` flag with any command:

```sh
linkedctl --profile work auth login --client-id ID --client-secret SECRET
linkedctl --profile work post "Hello from my work account!"
```

Manage profiles with the `profile` command:

```sh
linkedctl profile create work --access-token YOUR_TOKEN --api-version 202601
linkedctl profile list
linkedctl profile show work
linkedctl profile delete work
```

### Authentication Methods

#### OAuth 2.0 (Recommended)

LinkedCtl supports OAuth 2.0 with your own LinkedIn Developer App:

```sh
linkedctl auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
```

#### Direct Token

If you already have an access token from another application:

```sh
linkedctl auth token --access-token YOUR_TOKEN
```

### Environment Variables

| Variable                  | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `LINKEDCTL_CLIENT_ID`     | LinkedIn OAuth 2.0 client ID                             |
| `LINKEDCTL_CLIENT_SECRET` | LinkedIn OAuth 2.0 client secret                         |
| `LINKEDCTL_ACCESS_TOKEN`  | Direct access token (bypasses OAuth flow)                |
| `LINKEDCTL_API_VERSION`   | LinkedIn API version string (e.g. `202601`) **required** |

Environment variables take precedence over config file values.

#### Profile-Prefixed Environment Variables

When using a named profile, LinkedCtl also reads profile-prefixed environment variables. The profile name is uppercased with hyphens converted to underscores:

| Profile    | Variable                          |
| ---------- | --------------------------------- |
| (default)  | `LINKEDCTL_ACCESS_TOKEN`          |
| `work`     | `LINKEDCTL_WORK_ACCESS_TOKEN`     |
| `my-brand` | `LINKEDCTL_MY_BRAND_ACCESS_TOKEN` |

The same pattern applies to `CLIENT_ID`, `CLIENT_SECRET`, and `API_VERSION`.

### Precedence Order

Configuration values are resolved in this order (highest priority first):

1. **Environment variables** (profile-prefixed if a profile is active)
2. **Config file** (profile-specific file, or CWD/home fallback)

## CLI Reference

### Global Options

| Option             | Description                          |
| ------------------ | ------------------------------------ |
| `--profile <name>` | Use a specific configuration profile |
| `--json`           | Force JSON output                    |
| `-q, --quiet`      | Suppress informational output        |
| `--no-color`       | Disable color output                 |

### `auth` — Manage Authentication

| Command        | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `auth setup`   | Configure OAuth client credentials interactively           |
| `auth login`   | Authenticate via OAuth 2.0 (opens browser)                 |
| `auth token`   | Store a direct access token                                |
| `auth status`  | Show authentication status and token expiry                |
| `auth logout`  | Clear stored credentials from the active profile           |
| `auth refresh` | Refresh the access token using a stored refresh token      |
| `auth revoke`  | Revoke the access token server-side and clear local tokens |

**`auth login` options:**

| Option                     | Description                        | Default                          |
| -------------------------- | ---------------------------------- | -------------------------------- |
| `--client-id <id>`         | OAuth 2.0 client ID                | from config                      |
| `--client-secret <secret>` | OAuth 2.0 client secret            | from config                      |
| `--scope <scopes>`         | OAuth 2.0 scopes (space-separated) | `openid profile w_member_social` |

**`auth token` options:**

| Option                   | Description                      |
| ------------------------ | -------------------------------- |
| `--access-token <token>` | Access token to store (required) |

### `post` — Manage LinkedIn Posts

```sh
# Shorthand: pass text as an argument
linkedctl post "Hello from LinkedCtl!"

# Explicit subcommand
linkedctl post create --text "Hello from LinkedCtl!"

# Pipe content from stdin
echo "Hello from LinkedCtl!" | linkedctl post create
```

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `post create`       | Create a post on LinkedIn         |
| `post get <urn>`    | Fetch a post by URN               |
| `post list`         | List posts with pagination        |
| `post update <urn>` | Update a post's commentary text   |
| `post delete <urn>` | Delete a post (with confirmation) |

**`post create` options:**

| Option                       | Description                                                     | Default      |
| ---------------------------- | --------------------------------------------------------------- | ------------ |
| `--text <text>`              | Text content (also accepts `--text-file`, positional, or stdin) |              |
| `--visibility <visibility>`  | `PUBLIC` or `CONNECTIONS`                                       | `PUBLIC`     |
| `--draft`                    | Save as draft instead of publishing                             |              |
| `--image <urn>`              | Image URN to attach                                             |              |
| `--image-file <path>`        | Local image file to upload and attach                           |              |
| `--video <urn>`              | Video URN to attach                                             |              |
| `--video-file <path>`        | Local video file to upload and attach                           |              |
| `--document <urn>`           | Document URN to attach                                          |              |
| `--document-file <path>`     | Local document file to upload and attach                        |              |
| `--images <urns>`            | Multiple image URNs (comma-separated, minimum 2)                |              |
| `--image-files <paths>`      | Multiple local image files (comma-separated, minimum 2)         |              |
| `--article-url <url>`        | Article URL to attach                                           |              |
| `--poll <question>`          | Poll question text                                              |              |
| `--option <text>`            | Poll option (repeat 2–4 times)                                  |              |
| `--poll-duration <duration>` | `ONE_DAY`, `THREE_DAYS`, `ONE_WEEK`, or `TWO_WEEKS`             | `THREE_DAYS` |
| `--as-org <id>`              | Post as an organization (numeric ID)                            |              |
| `--format <format>`          | Output format (`json`, `table`)                                 | auto         |

**`post list` options:**

| Option          | Description                                | Default |
| --------------- | ------------------------------------------ | ------- |
| `--count <n>`   | Number of posts to return (max 100)        | `10`    |
| `--start <n>`   | Starting index for pagination              | `0`     |
| `--as-org <id>` | List posts of an organization (numeric ID) |         |

### `comment` — Manage Comments

| Command                        | Description                          |
| ------------------------------ | ------------------------------------ |
| `comment create <post-urn>`    | Create a comment on a post           |
| `comment list <post-urn>`      | List comments on a post              |
| `comment get <comment-urn>`    | Get a specific comment by URN        |
| `comment delete <comment-urn>` | Delete a comment (with confirmation) |

**`comment create` options:**

| Option          | Description                             |
| --------------- | --------------------------------------- |
| `--text <text>` | Comment text (required)                 |
| `--as-org <id>` | Comment as an organization (numeric ID) |

### `reaction` — Manage Reactions

| Command                 | Description                   |
| ----------------------- | ----------------------------- |
| `reaction create <urn>` | Add a reaction to a post      |
| `reaction list <urn>`   | List reactions on a post      |
| `reaction delete <urn>` | Remove a reaction from a post |

**`reaction create` options:**

| Option          | Description                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `--type <type>` | `LIKE`, `PRAISE`, `EMPATHY`, `INTEREST`, `APPRECIATION`, or `ENTERTAINMENT` (default `LIKE`) |
| `--as-org <id>` | React as an organization (numeric ID)                                                        |

### `org` — Manage Organizations

| Command              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| `org list`           | List organizations the authenticated user administers |
| `org get <id>`       | Get organization details                              |
| `org followers <id>` | Get organization follower count                       |

### `media` — Upload Media

| Command                        | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| `media upload-image <file>`    | Upload an image (JPG, PNG, GIF)                           |
| `media upload-video <file>`    | Upload a video                                            |
| `media upload-document <file>` | Upload a document (PDF, DOCX, PPTX, DOC, PPT; max 100 MB) |

All media commands accept `--as-org <id>` and `--format json|table`.

### `stats` — View Analytics

| Command            | Description                                         |
| ------------------ | --------------------------------------------------- |
| `stats post <urn>` | Get post analytics (impressions, reach, engagement) |
| `stats me`         | Get aggregated analytics across all your posts      |
| `stats org <id>`   | Get organization share statistics                   |

**Common options:**

| Option                             | Description                       |
| ---------------------------------- | --------------------------------- |
| `--from <date>` / `--start <date>` | Start of date range (YYYY-MM-DD)  |
| `--to <date>` / `--end <date>`     | End of date range (YYYY-MM-DD)    |
| `--time-granularity <granularity>` | `DAY` or `MONTH` (org stats only) |

### `profile` — Manage Configuration Profiles

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `profile create <name>` | Create a new profile                 |
| `profile list`          | List all profiles                    |
| `profile show [<name>]` | Show profile details (redacted)      |
| `profile delete <name>` | Delete a profile (with confirmation) |

**`profile create` options:**

| Option                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `--access-token <token>`  | OAuth 2.0 access token (required)              |
| `--api-version <version>` | LinkedIn API version, e.g. `202601` (required) |

### `whoami` — Show Current User

```sh
linkedctl whoami
linkedctl whoami --format json
```

| Option              | Description                     | Default |
| ------------------- | ------------------------------- | ------- |
| `--format <format>` | Output format (`json`, `table`) | auto    |

### `completion` — Shell Completions

```sh
linkedctl completion bash
linkedctl completion zsh
```

## Security

- **Dependabot** keeps dependencies up to date with automated pull requests
- **CodeQL** analysis runs on every push and pull request for automated vulnerability detection
- **Path traversal validation** on profile names prevents directory escape attacks
- **Unified auth error handling** across all MCP tools provides consistent authentication failure messages
- **Destructive operations** (delete post, delete comment, delete profile) require interactive confirmation unless `--force` is passed

## Disclaimer

This is an independent project and is not affiliated with, endorsed by, or associated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.txt)

**Using LinkedCtl as a CLI tool or MCP server**: No license obligations — use freely.

**Using `@linkedctl/core` as a library in your project**: Your combined work must be licensed under AGPL-3.0 (or a compatible license).
