// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * A LinkedIn comment on a post or other entity.
 */
export interface Comment {
  /** Comment URN (e.g. `urn:li:comment:(urn:li:activity:123,456)`). */
  urn: string;
  /** Author actor URN (e.g. `urn:li:person:abc123`). */
  actor: string;
  /** Parent entity URN that this comment belongs to. */
  object: string;
  /** Comment message text. */
  message: string;
  /** ISO 8601 timestamp when the comment was created. */
  createdAt: string;
}
