// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import { Command, InvalidArgumentError, Option } from "commander";
import {
  resolveConfig,
  LinkedInClient,
  getCurrentPersonUrn,
  createPost,
  LinkedInApiError,
  uploadImage,
  uploadVideo,
  uploadDocument,
  SUPPORTED_IMAGE_TYPES,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_MAX_SIZE_BYTES,
} from "@linkedctl/core";
import type { PostVisibility, PostContent } from "@linkedctl/core";
import { resolveFormat, formatOutput } from "../../output/index.js";
import type { OutputFormat } from "../../output/index.js";
import { readStdin } from "./stdin.js";

interface CreateOpts {
  text?: string | undefined;
  textFile?: string | undefined;
  visibility?: string | undefined;
  image?: string | undefined;
  video?: string | undefined;
  document?: string | undefined;
  articleUrl?: string | undefined;
  images?: string | undefined;
  imageFile?: string | undefined;
  videoFile?: string | undefined;
  documentFile?: string | undefined;
  imageFiles?: string | undefined;
  format?: string | undefined;
}

/**
 * Resolve the post text from --text option, --text-file, positional argument, or stdin.
 *
 * Precedence: --text > --text-file > positional argument > stdin.
 */
async function resolveText(
  textOpt: string | undefined,
  textFileOpt: string | undefined,
  textArg: string | undefined,
): Promise<string> {
  if (textOpt !== undefined && textOpt !== "") {
    return textOpt;
  }

  if (textFileOpt !== undefined && textFileOpt !== "") {
    const content = await readFile(textFileOpt, "utf-8");
    const trimmed = content.trim();
    if (trimmed !== "") {
      return trimmed;
    }
  }

  if (textArg !== undefined && textArg !== "") {
    return textArg;
  }

  if (!process.stdin.isTTY) {
    const stdin = await readStdin();
    if (stdin !== "") {
      return stdin;
    }
  }

  throw new Error(
    'No text provided. Use --text "message", --text-file <path>, pass text as an argument, or pipe text via stdin.',
  );
}

/**
 * Resolve media content from mutually exclusive CLI options (URN-based).
 *
 * Also validates mutual exclusivity against file-based options.
 */
function resolveContent(opts: CreateOpts): PostContent | undefined {
  const mediaFlags = [
    opts.image,
    opts.video,
    opts.document,
    opts.articleUrl,
    opts.images,
    opts.imageFile,
    opts.videoFile,
    opts.documentFile,
    opts.imageFiles,
  ].filter((v) => v !== undefined);

  if (mediaFlags.length > 1) {
    throw new Error(
      "Only one media option may be specified: --image, --video, --document, --article-url, --images, --image-file, --video-file, --document-file, or --image-files",
    );
  }

  if (opts.image !== undefined) {
    return { media: { id: opts.image } };
  }
  if (opts.video !== undefined) {
    return { media: { id: opts.video } };
  }
  if (opts.document !== undefined) {
    return { media: { id: opts.document } };
  }
  if (opts.articleUrl !== undefined) {
    return { article: { source: opts.articleUrl } };
  }
  if (opts.images !== undefined) {
    const ids = opts.images.split(",").map((s) => s.trim());
    if (ids.length < 2) {
      throw new Error("--images requires at least 2 comma-separated image URNs");
    }
    return { multiImage: { images: ids.map((id) => ({ id })) } };
  }
  return undefined;
}

/**
 * Resolve media content from file-based CLI options by uploading files first.
 */
async function resolveFileContent(
  opts: CreateOpts,
  client: LinkedInClient,
  ownerUrn: string,
): Promise<PostContent | undefined> {
  if (opts.imageFile !== undefined) {
    const ext = extname(opts.imageFile).toLowerCase();
    const contentType = SUPPORTED_IMAGE_TYPES.get(ext);
    if (contentType === undefined) {
      const supported = [...SUPPORTED_IMAGE_TYPES.keys()].join(", ");
      throw new Error(`Unsupported image format "${ext}". Supported formats: ${supported}`);
    }
    const data = new Uint8Array(await readFile(opts.imageFile));
    const urn = await uploadImage(client, { owner: ownerUrn, data, contentType });
    return { media: { id: urn } };
  }

  if (opts.videoFile !== undefined) {
    const fileStat = await stat(opts.videoFile);
    if (!fileStat.isFile()) {
      throw new Error(`Not a file: ${opts.videoFile}`);
    }
    const data = await readFile(opts.videoFile);
    const urn = await uploadVideo(client, { owner: ownerUrn, data });
    return { media: { id: urn } };
  }

  if (opts.documentFile !== undefined) {
    const ext = extname(opts.documentFile).toLowerCase();
    if (!DOCUMENT_EXTENSIONS.includes(ext as (typeof DOCUMENT_EXTENSIONS)[number])) {
      throw new Error(`Unsupported file type "${ext}". Supported types: ${DOCUMENT_EXTENSIONS.join(", ")}`);
    }
    const fileStat = await stat(opts.documentFile);
    if (fileStat.size > DOCUMENT_MAX_SIZE_BYTES) {
      const sizeMB = Math.round(fileStat.size / (1024 * 1024));
      throw new Error(`File is ${sizeMB} MB, which exceeds the 100 MB limit.`);
    }
    const data = new Uint8Array(await readFile(opts.documentFile));
    const urn = await uploadDocument(client, { owner: ownerUrn, data });
    return { media: { id: urn } };
  }

  if (opts.imageFiles !== undefined) {
    const paths = opts.imageFiles.split(",").map((s) => s.trim());
    if (paths.length < 2) {
      throw new Error("--image-files requires at least 2 comma-separated file paths");
    }
    const urns: string[] = [];
    for (const filePath of paths) {
      const ext = extname(filePath).toLowerCase();
      const contentType = SUPPORTED_IMAGE_TYPES.get(ext);
      if (contentType === undefined) {
        const supported = [...SUPPORTED_IMAGE_TYPES.keys()].join(", ");
        throw new Error(`Unsupported image format "${ext}" for file "${filePath}". Supported formats: ${supported}`);
      }
      const data = new Uint8Array(await readFile(filePath));
      const urn = await uploadImage(client, { owner: ownerUrn, data, contentType });
      urns.push(urn);
    }
    return { multiImage: { images: urns.map((id) => ({ id })) } };
  }

  return undefined;
}

/**
 * Shared action handler for creating a post.
 */
export async function createPostAction(textArg: string | undefined, opts: CreateOpts, cmd: Command): Promise<void> {
  const text = await resolveText(opts.text, opts.textFile, textArg);
  const content = resolveContent(opts);
  const globals = cmd.optsWithGlobals<{ profile?: string | undefined; json?: boolean | undefined }>();

  const { config } = await resolveConfig({
    profile: globals.profile,
    requiredScopes: ["openid", "profile", "email", "w_member_social"],
  });
  // resolveConfig guarantees oauth.accessToken and apiVersion are defined
  const accessToken = config.oauth?.accessToken ?? "";
  const apiVersion = config.apiVersion ?? "";
  const client = new LinkedInClient({ accessToken, apiVersion });

  const authorUrn = await getCurrentPersonUrn(client);

  const finalContent = content ?? (await resolveFileContent(opts, client, authorUrn));

  const visibility = (opts.visibility as PostVisibility | undefined) ?? "PUBLIC";

  try {
    const postUrn = await createPost(client, {
      author: authorUrn,
      text,
      visibility,
      content: finalContent,
    });

    const format = resolveFormat(opts.format as OutputFormat | undefined, process.stdout, globals.json === true);
    const output = formatOutput({ urn: postUrn }, format);
    console.log(output);
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Add media options shared between `post create` and `post` shorthand.
 */
export function addMediaOptions(cmd: Command): void {
  cmd.option("--image <urn>", "attach an image by URN");
  cmd.option("--video <urn>", "attach a video by URN");
  cmd.option("--document <urn>", "attach a document by URN");
  cmd.option("--article-url <url>", "attach an article link");
  cmd.option("--images <urns>", "attach multiple images (comma-separated URNs, minimum 2)");
  cmd.option("--image-file <path>", "upload a local image file and attach it");
  cmd.option("--video-file <path>", "upload a local video file and attach it");
  cmd.option("--document-file <path>", "upload a local document file and attach it");
  cmd.option("--image-files <paths>", "upload multiple local image files and attach them (comma-separated, minimum 2)");
}

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.description("Create a post on LinkedIn (text: --text > --text-file > positional > stdin)");
  cmd.argument("[text]", "text content of the post");
  cmd.option("--text <text>", "text content of the post (takes precedence over --text-file and positional argument)");
  cmd.option("--text-file <path>", "read post text from a UTF-8 file");
  cmd.addOption(
    new Option("--visibility <visibility>", "post visibility (PUBLIC or CONNECTIONS)")
      .choices(["PUBLIC", "CONNECTIONS"])
      .argParser((v: string) => {
        const normalized = v.toUpperCase();
        if (!["PUBLIC", "CONNECTIONS"].includes(normalized)) {
          throw new InvalidArgumentError("Allowed choices are PUBLIC, CONNECTIONS.");
        }
        return normalized;
      })
      .default("PUBLIC"),
  );
  addMediaOptions(cmd);
  cmd.addOption(new Option("--format <format>", "output format (json or table)").choices(["json", "table"]));

  cmd.addHelpText(
    "after",
    `
Examples:
  linkedctl post create "Hello from LinkedCtl!"
  linkedctl post create --text "Hello" --visibility CONNECTIONS
  linkedctl post create --text "Check this out" --image urn:li:image:C5608AQ...
  linkedctl post create --text "Watch this" --video urn:li:video:D5608AQ...
  linkedctl post create --text "Read more" --article-url https://example.com/article
  linkedctl post create --text "Gallery" --images urn:li:image:A1,urn:li:image:A2
  linkedctl post create --text "Photo" --image-file photo.jpg
  linkedctl post create --text "Video" --video-file clip.mp4
  linkedctl post create --text "Deck" --document-file deck.pdf
  linkedctl post create --text "Gallery" --image-files a.jpg,b.jpg
  echo "Hello" | linkedctl post create`,
  );

  cmd.action(async (text: string | undefined, opts: CreateOpts, actionCmd: Command) => {
    await createPostAction(text, opts, actionCmd);
  });

  return cmd;
}
