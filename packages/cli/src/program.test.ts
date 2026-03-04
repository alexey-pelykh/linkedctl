// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { describe, expect, it } from "vitest";
import { createProgram } from "./program.js";

describe("createProgram", () => {
  it("sets version when provided", () => {
    const program = createProgram("1.2.3");
    expect(program.version()).toBe("1.2.3");
  });

  it("does not set version when omitted", () => {
    const program = createProgram();
    expect(program.version()).toBeUndefined();
  });

  it("includes getting-started hint in help output", () => {
    const program = createProgram();
    let helpOutput = "";
    program.configureOutput({ writeOut: (str: string) => (helpOutput += str) });
    program.outputHelp();
    expect(helpOutput).toContain("Get started: linkedctl auth setup");
  });
});
