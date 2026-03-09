// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { uploadImageCommand } from "./upload-image.js";

export function mediaCommand(): Command {
  const cmd = new Command("media");
  cmd.description("Manage LinkedIn media assets");

  cmd.addCommand(uploadImageCommand());

  return cmd;
}
