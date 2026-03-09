// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, stat } from "node:fs/promises";

import { Command, Option } from "commander";
import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  getOrganization,
  uploadVideo,
  LinkedInApiError,
} from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface UploadVideoOpts {
  format?: string | undefined;
  asOrg?: string | undefined;
}

export function uploadVideoCommand(): Command {
  const cmd = new Command("upload-video");
  cmd.description("Upload a video to LinkedIn via multipart upload");
  cmd.argument("<file>", "path to the video file (MP4)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));
  cmd.option("--as-org <id>", "upload as an organization (specify org ID)");

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl media upload-video clip.mp4
  linkedctl media upload-video ~/Videos/demo.mp4 --format json
  linkedctl media upload-video promo.mp4 --as-org 12345`,
  );

  cmd.action(async (file: string, opts: UploadVideoOpts, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const fileStat = await stat(file);
    if (!fileStat.isFile()) {
      throw new Error(`Not a file: ${file}`);
    }

    const data = await readFile(file);

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    let ownerUrn: string;
    if (opts.asOrg !== undefined) {
      await getOrganization(client, opts.asOrg);
      ownerUrn = `urn:li:organization:${opts.asOrg}`;
    } else {
      ownerUrn = await getCurrentPersonUrn(client);
    }

    try {
      console.error(`Uploading video (${data.byteLength} bytes)…`);
      const videoUrn = await uploadVideo(client, { owner: ownerUrn, data });

      const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
      const output = formatOutput({ urn: videoUrn }, format);
      console.log(output);
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to upload video: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
