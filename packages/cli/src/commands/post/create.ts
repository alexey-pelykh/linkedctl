// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";
import { resolveConfig, LinkedInClient, getCurrentPersonUrn, createTextPost, LinkedInApiError } from "@linkedctl/core";
import type { PostVisibility } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";
import { readStdin } from "./stdin.js";

interface CreateOpts {
  text?: string | undefined;
  visibility?: string | undefined;
  format?: string | undefined;
}

/**
 * Resolve the post text from options, arguments, or stdin.
 */
async function resolveText(textOpt: string | undefined): Promise<string> {
  if (textOpt !== undefined && textOpt !== "") {
    return textOpt;
  }

  if (!process.stdin.isTTY) {
    const stdin = await readStdin();
    if (stdin !== "") {
      return stdin;
    }
  }

  throw new Error('No text provided. Use --text "message", pass text as an argument, or pipe text via stdin.');
}

/**
 * Shared action handler for creating a text post.
 */
export async function createPostAction(textOpt: string | undefined, opts: CreateOpts, cmd: Command): Promise<void> {
  const text = await resolveText(textOpt);
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined }>();

  const { config } = await resolveConfig({ profile: globals.profile });
  // resolveConfig guarantees oauth.accessToken and apiVersion are defined
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const authorUrn = await getCurrentPersonUrn(client);

  const visibility = (opts.visibility as PostVisibility | undefined) ?? "PUBLIC";

  try {
    const postUrn = await createTextPost(client, {
      author: authorUrn,
      text,
      visibility,
    });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout);
    const output = formatOutput({ urn: postUrn }, format);
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
    throw error;
  }
}

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a text post on LinkedIn");
  cmd.option("--text <text>", "text content of the post");
  cmd.option("--visibility <visibility>", "post visibility (PUBLIC or CONNECTIONS)", "PUBLIC");
  cmd.option("--format <format>", "output format (json or table)");

  cmd.action(async (opts: CreateOpts, actionCmd: Command) => {
    await createPostAction(opts.text, opts, actionCmd);
  });

  return cmd;
}
