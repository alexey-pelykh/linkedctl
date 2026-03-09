// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { ExitCode } from "./exit-codes.js";

describe("ExitCode", () => {
  it("defines SUCCESS as 0", () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it("defines RUNTIME_ERROR as 1", () => {
    expect(ExitCode.RUNTIME_ERROR).toBe(1);
  });

  it("defines USAGE_ERROR as 2", () => {
    expect(ExitCode.USAGE_ERROR).toBe(2);
  });
});
