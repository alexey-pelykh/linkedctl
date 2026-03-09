// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, listReactions, LinkedInApiError } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface ListOpts {
  format?: string | undefined;
}

export async function listReactionsAction(entityUrn: string, opts: ListOpts, cmd: Command): Promise<void> {
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  try {
    const reactions = await listReactions(client, { entity: entityUrn });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
    const output = formatOutput(
      reactions.map((r) => ({
        actor: r.actor,
        type: r.reactionType,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
      format,
    );
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to list reactions: ${error.message}`);
    }
    throw error;
  }
}

export function listReactionsCommand(): Command {
  const cmd = new Command("list");
  cmd.description("List reactions on a LinkedIn post");
  cmd.argument("<entity-urn>", "entity URN to list reactions for (e.g. urn:li:share:abc123)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl reaction list urn:li:share:abc123
  linkedctl reaction list urn:li:share:abc123 --format json`,
  );

  cmd.action(async (entityUrn: string, opts: ListOpts, actionCmd: Command) => {
    await listReactionsAction(entityUrn, opts, actionCmd);
  });

  return cmd;
}
