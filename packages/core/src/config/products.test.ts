// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { PRODUCT_PRESETS, PRODUCT_NAMES, resolveProductScopes } from "./products.js";

describe("PRODUCT_PRESETS", () => {
  it("defines a share preset", () => {
    expect(PRODUCT_PRESETS["share"]).toBeDefined();
    expect(PRODUCT_PRESETS["share"]?.scopes).toEqual(["openid", "profile", "w_member_social"]);
  });

  it("defines a community-management preset", () => {
    expect(PRODUCT_PRESETS["community-management"]).toBeDefined();
    expect(PRODUCT_PRESETS["community-management"]?.scopes).toEqual(["r_member_postAnalytics"]);
  });
});

describe("PRODUCT_NAMES", () => {
  it("lists all product identifiers", () => {
    expect(PRODUCT_NAMES).toContain("share");
    expect(PRODUCT_NAMES).toContain("community-management");
  });
});

describe("resolveProductScopes", () => {
  it("returns scopes for share product", () => {
    expect(resolveProductScopes("share")).toBe("openid profile w_member_social");
  });

  it("returns scopes for community-management product", () => {
    expect(resolveProductScopes("community-management")).toBe("r_member_postAnalytics");
  });

  it("returns undefined for unknown product", () => {
    expect(resolveProductScopes("unknown")).toBeUndefined();
  });
});
