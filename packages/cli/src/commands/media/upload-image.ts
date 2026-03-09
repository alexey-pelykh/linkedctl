// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { Command, Option } from "commander";
import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  uploadImage,
  LinkedInApiError,
  SUPPORTED_IMAGE_TYPES,
} from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface UploadImageOpts {
  format?: string | undefined;
}

export function uploadImageCommand(): Command {
  const cmd = new Command("upload-image");
  cmd.description("Upload an image to LinkedIn and return the image URN");
  cmd.argument("<file>", "path to image file (JPG, PNG, or GIF)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl media upload-image photo.jpg
  linkedctl media upload-image banner.png --format json`,
  );

  cmd.action(async (file: string, opts: UploadImageOpts, actionCmd: Command) => {
    const ext = extname(file).toLowerCase();
    const contentType = SUPPORTED_IMAGE_TYPES.get(ext);
    if (contentType === undefined) {
      const supported = [...SUPPORTED_IMAGE_TYPES.keys()].join(", ");
      throw new Error(`Unsupported image format "${ext}". Supported formats: ${supported}`);
    }

    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    const ownerUrn = await getCurrentPersonUrn(client);
    const data = new Uint8Array(await readFile(file));

    try {
      const imageUrn = await uploadImage(client, {
        owner: ownerUrn,
        data,
        contentType,
      });

      const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ urn: imageUrn }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
