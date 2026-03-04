# @linkedctl/core

Core library for LinkedIn API integration -- OAuth 2.0, HTTP client, and service layer used by [`linkedctl`](https://github.com/alexey-pelykh/linkedctl).

## Installation

```sh
npm install @linkedctl/core
```

Requires Node.js >= 24.

## API Surface

### HTTP Client

- **`LinkedInClient`** -- authenticated HTTP client for the LinkedIn REST API

### OAuth 2.0

- **`buildAuthorizationUrl`** -- construct the OAuth 2.0 authorization URL
- **`exchangeAuthorizationCode`** -- exchange an authorization code for tokens
- **`refreshAccessToken`** -- refresh an expired access token
- **`revokeAccessToken`** -- revoke an access token server-side
- **`generateCodeVerifier`** / **`computeCodeChallenge`** -- PKCE helpers

### Configuration

- **`resolveConfig`** -- resolve a complete configuration from file + environment
- **`loadConfigFile`** / **`validateConfig`** -- load and validate config files
- **`saveOAuthTokens`** / **`saveOAuthClientCredentials`** / **`clearOAuthTokens`** -- persist credentials
- **`applyEnvOverlay`** -- overlay environment variables onto config

### Services

- **`getUserInfo`** / **`getCurrentPersonUrn`** -- fetch authenticated user info
- **`createTextPost`** -- create a text post on LinkedIn
- **`getTokenExpiry`** -- introspect JWT token expiry

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.txt)

**Using `@linkedctl/core` as a library in your project**: Your combined work must be licensed under AGPL-3.0 (or a compatible license).

See the [main project](https://github.com/alexey-pelykh/linkedctl) for full documentation.
