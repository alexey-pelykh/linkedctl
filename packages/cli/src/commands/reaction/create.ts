// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command, Option } from "commander";
import { resolveConfig, LinkedInClient, createReaction, LinkedInApiError, REACTION_TYPES } from "@linkedctl/core";
import type { ReactionType } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";

interface CreateOpts {
  type?: string | undefined;
  asOrg?: string | undefined;
  format?: string | undefined;
}

export async function createReactionAction(entityUrn: string, opts: CreateOpts, cmd: Command): Promise<void> {
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const reactionType = (opts.type ?? "LIKE") as ReactionType;
  const actor = opts.asOrg !== undefined ? `urn:li:organization:${opts.asOrg}` : undefined;

  try {
    const reactionUrn = await createReaction(client, {
      entity: entityUrn,
      reactionType,
      actor,
    });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
    const output = formatOutput({ urn: reactionUrn }, format);
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to create reaction: ${error.message}`);
    }
    throw error;
  }
}

export function createReactionCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Add a reaction to a LinkedIn post");
  cmd.argument("<entity-urn>", "entity URN to react to (e.g. urn:li:share:abc123)");
  cmd.addOption(new Option("--type <type>", "reaction type").choices([...REACTION_TYPES]).default("LIKE"));
  cmd.option("--as-org <org-id>", "act as organization (numeric ID, e.g. 12345)");
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl reaction create urn:li:share:abc123
  linkedctl reaction create urn:li:share:abc123 --type PRAISE
  linkedctl reaction create urn:li:share:abc123 --type ENTERTAINMENT --format json
  linkedctl reaction create urn:li:share:abc123 --as-org 12345`,
  );

  cmd.action(async (entityUrn: string, opts: CreateOpts, actionCmd: Command) => {
    await createReactionAction(entityUrn, opts, actionCmd);
  });

  return cmd;
}
