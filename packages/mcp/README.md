# @linkedctl/mcp

MCP (Model Context Protocol) server for LinkedIn API integration -- the AI-tool interface used by [`linkedctl`](https://github.com/alexey-pelykh/linkedctl).

## Installation

```sh
npm install @linkedctl/mcp
```

Requires Node.js >= 24.

## Overview

This package provides an MCP server that exposes LinkedIn API operations as tools for AI assistants (Claude, Cursor, etc.). It registers tools for creating posts, checking authentication status, and revoking tokens.

For full MCP integration documentation and available tools, see the [main project](https://github.com/alexey-pelykh/linkedctl).

> **Note:** For end-user usage with Claude Desktop or other MCP clients, install the [`linkedctl`](https://www.npmjs.com/package/linkedctl) umbrella package instead. This package is for programmatic access to the MCP server.

## Usage with Claude Desktop

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

## Usage with Claude Code

```sh
claude mcp add linkedctl -- npx linkedctl mcp
```

## Usage with Cursor

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

## Usage with Windsurf

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

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.txt)
