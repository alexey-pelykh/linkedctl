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
   linkedctl auth login
   ```
4. Start using:
   ```sh
   linkedctl post "Hello from LinkedCtl!"
   ```

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

| Variable | Description |
|----------|-------------|
| `LINKEDCTL_CLIENT_ID` | LinkedIn OAuth 2.0 client ID |
| `LINKEDCTL_CLIENT_SECRET` | LinkedIn OAuth 2.0 client secret |
| `LINKEDCTL_ACCESS_TOKEN` | Direct access token (bypasses OAuth flow) |

## Disclaimer

This is an independent project and is not affiliated with, endorsed by, or associated with LinkedIn Corporation. LinkedIn is a trademark of LinkedIn Corporation.

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.txt)

**Using LinkedCtl as a CLI tool or MCP server**: No license obligations — use freely.

**Using `@linkedctl/core` as a library in your project**: Your combined work must be licensed under AGPL-3.0 (or a compatible license).
