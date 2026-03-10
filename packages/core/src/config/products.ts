// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

/**
 * A LinkedIn product preset that maps a product name to the OAuth scopes it requires.
 */
export interface ProductPreset {
  /** Human-readable product name. */
  readonly label: string;
  /** OAuth scopes required by this product. */
  readonly scopes: readonly string[];
}

/**
 * Known LinkedIn product presets.
 *
 * Each key is a CLI-friendly product identifier; the value describes the
 * scopes that must be requested when configuring OAuth for that product.
 */
export const PRODUCT_PRESETS: Readonly<Record<string, ProductPreset>> = {
  share: {
    label: "Share on LinkedIn",
    scopes: ["openid", "profile", "w_member_social"],
  },
  "community-management": {
    label: "Community Management API",
    scopes: ["r_member_postAnalytics"],
  },
};

/**
 * Valid product identifiers accepted by `--product`.
 */
export const PRODUCT_NAMES = Object.keys(PRODUCT_PRESETS);

/**
 * Resolve a product identifier to its scope string.
 * Returns `undefined` when the identifier is not recognised.
 */
export function resolveProductScopes(product: string): string | undefined {
  const preset = PRODUCT_PRESETS[product];
  if (preset === undefined) {
    return undefined;
  }
  return preset.scopes.join(" ");
}
