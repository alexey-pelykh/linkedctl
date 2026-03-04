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

### OAuth 2.0 (Recommended)

LinkedCtl supports OAuth 2.0 with your own LinkedIn Developer App:

```sh
linkedctl auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
```

### Direct Token

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
