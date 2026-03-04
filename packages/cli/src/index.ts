// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

export type { OutputFormat } from "./output/index.js";
export { detectFormat, resolveFormat, formatJson, formatTable, formatOutput, isColorEnabled } from "./output/index.js";
export { createProgram } from "./program.js";
