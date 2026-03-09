// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, getCurrentPersonUrn, listPosts, LinkedInApiError } from "@linkedctl/core";
import type { OutputFormat } from "../../output/index.js";
import { resolveFormat, formatOutput } from "../../output/index.js";

export function listCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List your LinkedIn posts");
  cmd.option("--count <count>", "number of posts to return (default 10, max 100)", "10");
  cmd.option("--start <start>", "starting index for pagination (default 0)", "0");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.action(async (opts: Record<string, unknown>, actionCmd: Command) => {
    const globals = actionCmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

    const { config } = await resolveConfig({
      profile: globals.profile,
      requiredScopes: ["openid", "profile", "email", "w_member_social"],
    });
    const accessToken = config.oauth?.accessToken ?? "";
    const apiVersion = config.apiVersion ?? "";
    const client = new LinkedInClient({ accessToken, apiVersion });

    try {
      const authorUrn = await getCurrentPersonUrn(client);
      const count = parseInt(opts["count"] as string, 10);
      const start = parseInt(opts["start"] as string, 10);

      const response = await listPosts(client, { author: authorUrn, count, start });

      const format = resolveFormat(opts["format"] as OutputFormat | undefined, process.stdout, globals.json === true);

      if (format === "json") {
        console.log(formatOutput(response, format));
      } else {
        if (response.elements.length === 0) {
          console.log("No posts found.");
          return;
        }
        const rows = response.elements.map((post) => ({
          urn: post.id,
          visibility: post.visibility,
          commentary: post.commentary.length > 80 ? post.commentary.slice(0, 77) + "..." : post.commentary,
          lifecycleState: post.lifecycleState,
        }));
        console.log(formatOutput(rows, format));
      }
    } catch (error) {
      if (error instanceof LinkedInApiError) {
        throw new Error(`Failed to list posts: ${error.message}`);
      }
      throw error;
    }
  });

  return cmd;
}
