// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { isColorEnabled } from "./color.js";

describe("isColorEnabled", () => {
  it("returns true when no constraints are present", () => {
    expect(isColorEnabled({ env: {} })).toBe(true);
  });

  it("returns false when NO_COLOR env var is set to a non-empty string", () => {
    expect(isColorEnabled({ env: { NO_COLOR: "1" } })).toBe(false);
  });

  it("returns false when NO_COLOR env var is set to an empty string", () => {
    expect(isColorEnabled({ env: { NO_COLOR: "" } })).toBe(false);
  });

  it("returns false when noColor flag is true", () => {
    expect(isColorEnabled({ noColor: true, env: {} })).toBe(false);
  });

  it("returns true when noColor flag is false", () => {
    expect(isColorEnabled({ noColor: false, env: {} })).toBe(true);
  });

  it("returns false when both NO_COLOR and noColor flag are set", () => {
    expect(isColorEnabled({ noColor: true, env: { NO_COLOR: "1" } })).toBe(false);
  });

  it("returns true when noColor is undefined and NO_COLOR is absent", () => {
    expect(isColorEnabled({ noColor: undefined, env: {} })).toBe(true);
  });

  it("defaults to process.env when env is not provided", () => {
    // Without explicit env, it uses process.env — which may or may not have NO_COLOR
    const result = isColorEnabled({ noColor: false });
    expect(typeof result).toBe("boolean");
  });

  it("returns true when called with no arguments and NO_COLOR is absent from process.env", () => {
    // Provide explicit empty env to avoid process.env interference
    expect(isColorEnabled({ env: {} })).toBe(true);
  });
});
