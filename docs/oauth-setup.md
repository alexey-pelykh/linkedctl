# OAuth Setup Guide

This guide walks you through creating a LinkedIn Developer App and authenticating LinkedCtl.

## Prerequisites

- [Node.js](https://nodejs.org) >= 24
- LinkedCtl installed (`npm install -g linkedctl`)
- A [LinkedIn](https://www.linkedin.com) account

## 1. Create a LinkedIn Developer App

1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in the required fields:
    - **App name** — a name for your application (e.g. "LinkedCtl")
    - **LinkedIn Page** — associate it with a LinkedIn Page you admin (required by LinkedIn)
    - **App logo** — upload a logo image
    - **Legal agreement** — accept the terms
4. Click **Create app**

## 2. Configure OAuth 2.0 Settings

After creating the app, configure the OAuth 2.0 redirect URL:

1. Open your app in the [Developer Portal](https://www.linkedin.com/developers/apps)
2. Go to the **Auth** tab
3. Under **OAuth 2.0 settings**, find **Authorized redirect URLs for your app**
4. Add `http://127.0.0.1:18920/callback` as an authorized redirect URL
5. Click **Update** to save

> **Note:** LinkedCtl starts a local callback server on port `18920` by default. If you
> need a different port, pass `--port <number>` to `linkedctl auth login` and register
> the matching redirect URL (e.g. `http://127.0.0.1:<number>/callback`).

## 3. Request OAuth Scopes

LinkedCtl requires specific OAuth scopes depending on which features you use:

| Scope             | Required for                  | Product                                    |
| ----------------- | ----------------------------- | ------------------------------------------ |
| `openid`          | Authentication, `whoami`      | Sign In with LinkedIn using OpenID Connect |
| `profile`         | User profile access, `whoami` | Sign In with LinkedIn using OpenID Connect |
| `w_member_social` | Creating posts                | Share on LinkedIn                          |

To enable these scopes:

1. In your app settings, go to the **Products** tab
2. Request access to **Sign In with LinkedIn using OpenID Connect** — this grants `openid` and `profile`
3. Request access to **Share on LinkedIn** — this grants `w_member_social`
4. Wait for approval (some products are approved instantly, others may take time)

You can verify your available scopes under the **Auth** tab in the **OAuth 2.0 scopes** section.

## 4. Copy Your Credentials

1. Go to the **Auth** tab of your app
2. Note your **Client ID**
3. Click the eye icon next to **Primary Client Secret** to reveal it, then copy it

> **Security:** Treat your client secret like a password. Do not commit it to version
> control or share it publicly.

## 5. Set the API Version

LinkedCtl requires a LinkedIn API version to be configured. LinkedIn uses date-based version strings (e.g. `202601`). You can find the current version in the [LinkedIn API documentation](https://learn.microsoft.com/en-us/linkedin/marketing/versioning).

There are three ways to set the API version:

**Option A: Config file** — add `api-version` to your config file:

```yaml
api-version: "202601"
```

LinkedCtl searches for config files in this order: `.linkedctl.yaml` in the current directory, then `~/.linkedctl.yaml` in the home directory. When using a named profile (e.g. `--profile work`), the config is stored at `~/.linkedctl/work.yaml` instead.

**Option B: Environment variable**:

```sh
export LINKEDCTL_API_VERSION=202601
```

When using a named profile, prefix the variable with the uppercased profile name (hyphens become underscores). For example, profile `work` reads `LINKEDCTL_WORK_API_VERSION`.

**Option C: Profile creation** — when creating a named profile, pass `--api-version`:

```sh
linkedctl profile create myprofile --access-token YOUR_TOKEN --api-version 202601
```

> **Note:** The API version is required. If it is not set, LinkedCtl will exit with a `ConfigError` message telling you to set `LINKEDCTL_API_VERSION`, use `--api-version`, or add `api-version` to your config file.

## 6. Authenticate with LinkedCtl

Run the login command with your credentials:

```sh
linkedctl auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
```

This will:

1. Start a local callback server
2. Open your browser to the LinkedIn authorization page
3. After you approve, LinkedIn redirects back to the local server
4. LinkedCtl exchanges the authorization code for access and refresh tokens
5. Credentials are saved to `~/.linkedctl.yaml`

To authenticate a **named profile** instead, add the `--profile` flag:

```sh
linkedctl --profile work auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
```

Credentials for named profiles are saved to `~/.linkedctl/<profile>.yaml` (e.g. `~/.linkedctl/work.yaml`).

If the browser does not open automatically, copy the URL printed in the terminal and open it manually.

### Subsequent logins

Once authenticated, LinkedCtl stores a refresh token. Future calls to `linkedctl auth login` will attempt a token refresh automatically — no browser interaction needed unless the refresh token has expired.

### Using environment variables

Instead of passing flags, you can set environment variables:

```sh
export LINKEDCTL_CLIENT_ID=YOUR_CLIENT_ID
export LINKEDCTL_CLIENT_SECRET=YOUR_CLIENT_SECRET
export LINKEDCTL_API_VERSION=202601
linkedctl auth login
```

For named profiles, use profile-prefixed variables (e.g. `LINKEDCTL_WORK_CLIENT_ID` for profile `work`).

## 7. Verify Authentication

Check that authentication is working:

```sh
linkedctl auth status
```

Expected output:

```text
Profile: default
Status: authenticated
Expires: 2026-05-03T12:00:00.000Z (59d 23h remaining)
```

For a named profile:

```sh
linkedctl --profile work auth status
```

```text
Profile: work
Status: authenticated
Expires: 2026-05-03T12:00:00.000Z (59d 23h remaining)
```

Then verify your identity:

```sh
linkedctl whoami
```

Expected output:

```text
name     email              picture
───────  ─────────────────  ───────────────────────────────
Jane Doe jane@example.com   https://media.licdn.com/...
```

## 8. Start Using LinkedCtl

You are now ready to use LinkedCtl. For example, create a post:

```sh
linkedctl post "Hello from LinkedCtl!"
```

## Troubleshooting

### "Missing OAuth2 credentials" error

You need to provide `--client-id` and `--client-secret` on the first login. After the first successful login, these are stored in your profile.

### Browser does not open

Copy the authorization URL from the terminal output and open it manually in your browser.

### "Authorization denied" error

Make sure you clicked **Allow** on the LinkedIn authorization page. If you denied access, run the login command again.

### Token expired

Access tokens are valid for approximately 60 days. Run `linkedctl auth login` again to refresh. If the refresh token has also expired, a full browser-based authorization flow will start.

### Scope errors when posting

If you get permission errors when creating posts, verify that your LinkedIn app has the **Share on LinkedIn** product enabled and that the `w_member_social` scope is listed under your app's OAuth 2.0 scopes.

## Next Steps

Now that authentication is configured, explore what LinkedCtl can do:

- [CLI Reference](../README.md#cli-reference) — all available commands and options
- [MCP Integration](../README.md#mcp-integration) — connect LinkedCtl to AI assistants like Claude
