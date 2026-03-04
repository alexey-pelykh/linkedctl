# LinkedCtl

[![CI](https://img.shields.io/github/check-runs/alexey-pelykh/linkedctl/main)](https://github.com/alexey-pelykh/linkedctl/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/alexey-pelykh/linkedctl)](https://www.gnu.org/licenses/agpl-3.0.txt)

OAuth2 CLI and MCP server for the [LinkedIn](https://www.linkedin.com) API.

## What It Does

- **Post content** to LinkedIn via the official API
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

See the [OAuth Setup Guide](docs/oauth-setup.md) for detailed step-by-step instructions.

## MCP Integration

### Claude Code

```sh
claude mcp add linkedctl -- npx linkedctl mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

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

### Available Tools

#### `post_create`

Create a text post on LinkedIn.

| Parameter    | Type     | Required | Description                                        |
| ------------ | -------- | -------- | -------------------------------------------------- |
| `text`       | `string` | Yes      | The text content of the post                       |
| `visibility` | `string` | No       | `"PUBLIC"` or `"CONNECTIONS"` (default `"PUBLIC"`) |
| `profile`    | `string` | No       | Profile name to use from config file               |

#### `auth_status`

Show authentication status for a profile.

| Parameter | Type     | Required | Description                                           |
| --------- | -------- | -------- | ----------------------------------------------------- |
| `profile` | `string` | No       | Profile name to check (uses default if not specified) |

#### `auth_revoke`

Revoke the access token server-side and clear local credentials for a profile.

| Parameter | Type     | Required | Description                                            |
| --------- | -------- | -------- | ------------------------------------------------------ |
| `profile` | `string` | No       | Profile name to revoke (uses default if not specified) |

## Configuration

### Config File Format

LinkedCtl stores configuration in YAML files. Each file represents a single profile:

```yaml
api-version: "202501"
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
| `api-version`            | LinkedIn API version (e.g. `202501`)  |
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
linkedctl profile create work --access-token YOUR_TOKEN --api-version 202501
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
| `LINKEDCTL_API_VERSION`   | LinkedIn API version string (e.g. `202501`) **required** |

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

### `auth` -- Manage Authentication

| Command        | Description                                                |
| -------------- | ---------------------------------------------------------- |
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

### `post` -- Manage LinkedIn Posts

```sh
# Shorthand: pass text as an argument
linkedctl post "Hello from LinkedCtl!"

# Explicit subcommand
linkedctl post create --text "Hello from LinkedCtl!"

# Pipe content from stdin
echo "Hello from LinkedCtl!" | linkedctl post create
```

**`post create` options:**

| Option                      | Description                     | Default  |
| --------------------------- | ------------------------------- | -------- |
| `--text <text>`             | Text content of the post        |          |
| `--visibility <visibility>` | `PUBLIC` or `CONNECTIONS`       | `PUBLIC` |
| `--format <format>`         | Output format (`json`, `table`) | auto     |

When no `--text` is provided, text is read from stdin if available.

The `--format` option defaults to `table` in a terminal and `json` when piped.

### `profile` -- Manage Configuration Profiles

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `profile create <name>` | Create a new profile            |
| `profile list`          | List all profiles               |
| `profile show <name>`   | Show profile details (redacted) |
| `profile delete <name>` | Delete a profile                |

**`profile create` options:**

| Option                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `--access-token <token>`  | OAuth 2.0 access token (required)              |
| `--api-version <version>` | LinkedIn API version, e.g. `202501` (required) |

### `whoami` -- Show Current User

```sh
linkedctl whoami
linkedctl whoami --format json
```

| Option              | Description                     | Default |
| ------------------- | ------------------------------- | ------- |
| `--format <format>` | Output format (`json`, `table`) | auto    |

## Disclaimer

This is an independent project and is not affiliated with, endorsed by, or associated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.txt)

**Using LinkedCtl as a CLI tool or MCP server**: No license obligations — use freely.

**Using `@linkedctl/core` as a library in your project**: Your combined work must be licensed under AGPL-3.0 (or a compatible license).
