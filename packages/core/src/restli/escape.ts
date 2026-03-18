// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * Escape REST.li reserved characters in text intended for LinkedIn API text fields
 * (e.g. post commentary, comment message).
 *
 * LinkedIn's REST.li 2.0.0 protocol uses characters like `(`, `)`, `[`, `]`, `{`, `}`
 * as syntax delimiters for compound keys, mentions, and other structured expressions.
 * A secondary server-side parser scans text fields for mentions and hashtags, and
 * unescaped reserved characters can cause **silent truncation** — the API returns
 * a success response but the published text is cut off at the first unescaped
 * reserved character.
 *
 * The following characters must be backslash-escaped per LinkedIn/Microsoft
 * documentation: `_ | ( ) [ ] { } @ # * ~ < > \`
 *
 * @see https://github.com/alexey-pelykh/linkedctl/issues/194
 */
export function escapeRestliReservedCharacters(text: string): string {
  return text.replace(/[_|()[\]{}<>@#*~\\]/g, (ch) => `\\${ch}`);
}
