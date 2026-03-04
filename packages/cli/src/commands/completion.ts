// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH

import { Command } from "commander";

interface CommandInfo {
  readonly name: string;
  readonly subcommands: readonly string[];
  readonly options: readonly string[];
}

function collectCommands(cmd: Command, prefix: string): CommandInfo[] {
  const result: CommandInfo[] = [];
  const name = prefix ? `${prefix} ${cmd.name()}` : cmd.name();
  const subcommands = cmd.commands.map((c) => c.name());
  const options = cmd.options.map((o) => o.long).filter((o): o is string => o !== undefined);

  result.push({ name, subcommands, options });

  for (const sub of cmd.commands) {
    result.push(...collectCommands(sub, name));
  }

  return result;
}

function generateBash(program: Command): string {
  const commands = collectCommands(program, "");
  const rootName = program.name();

  const d = "$";

  const cases = commands
    .map((cmd) => {
      const words = [...cmd.subcommands, ...cmd.options].join(" ");
      const pattern = cmd.name === rootName ? rootName : cmd.name.replace(`${rootName} `, "").replace(/ /g, "__");
      return `    ${pattern})\n      COMPREPLY=(${d}(compgen -W "${words}" -- "${d}{cur}"))\n      return 0\n      ;;`;
    })
    .join("\n");

  const cmdLookup = commands
    .filter((cmd) => cmd.name !== rootName)
    .map((cmd) => {
      const parts = cmd.name.replace(`${rootName} `, "").split(" ");
      return `    ${parts.join("__")}) cmd="${parts.join("__")}" ;;`;
    })
    .join("\n");

  return `# bash completion for ${rootName}
# eval "${d}(${rootName} completion bash)"

_${rootName}_completions() {
  local cur prev words cword cmd
  _init_completion || return

  cmd="${rootName}"
  for ((i=1; i < cword; i++)); do
    case "${d}{words[i]}" in
      -*) ;;
      *)
        local subcmd
        if [ "${d}{cmd}" = "${rootName}" ]; then
          subcmd="${d}{words[i]}"
        else
          subcmd="${d}{cmd}__${d}{words[i]}"
        fi
        case "${d}{subcmd}" in
${cmdLookup}
          *) ;;
        esac
        ;;
    esac
  done

  case "${d}{cmd}" in
${cases}
  esac
}

complete -F _${rootName}_completions ${rootName}
`;
}

function generateZsh(program: Command): string {
  const commands = collectCommands(program, "");
  const rootName = program.name();
  const d = "$";

  const helperPrefix = `__${rootName}`;
  const functions: string[] = [];
  for (const cmd of commands) {
    const fnName = cmd.name.replace(/ /g, "_");
    const optionArgs = cmd.options.map((opt) => `'${opt}[option]'`);

    if (cmd.subcommands.length > 0) {
      const subcmds = cmd.subcommands.map((s) => `'${s}:${s} command'`);
      functions.push(`${helperPrefix}_${fnName}() {
  local -a commands options
  commands=(${subcmds.join(" ")})
  options=(${optionArgs.join(" ")})
  _describe -t commands 'commands' commands
  _describe -t options 'options' options
}`);
    } else if (optionArgs.length > 0) {
      functions.push(`${helperPrefix}_${fnName}() {
  local -a options
  options=(${optionArgs.join(" ")})
  _describe -t options 'options' options
}`);
    }
  }

  // Build routing cases for root subcommands
  const rootCmd = commands.find((c) => c.name === rootName);
  const rootSubcases = (rootCmd?.subcommands ?? [])
    .map((sub) => {
      const childCmd = commands.find((c) => c.name === `${rootName} ${sub}`);
      if (!childCmd || (childCmd.subcommands.length === 0 && childCmd.options.length === 0)) return null;
      const childSubcases = childCmd.subcommands
        .map((subsub) => {
          const leafFn = `${rootName}_${sub}_${subsub}`;
          const exists = functions.some((f) => f.includes(`${helperPrefix}_${leafFn}()`));
          return exists ? `              ${subsub}) ${helperPrefix}_${leafFn} ;;` : null;
        })
        .filter(Boolean)
        .join("\n");

      if (childCmd.subcommands.length > 0 && childSubcases) {
        return `        ${sub})
          if (( CURRENT == 2 )); then
            ${helperPrefix}_${rootName}_${sub}
          else
            case "${d}{line[2]}" in
${childSubcases}
            esac
          fi
          ;;`;
      }
      return `        ${sub}) ${helperPrefix}_${rootName}_${sub} ;;`;
    })
    .filter(Boolean)
    .join("\n");

  return `#compdef ${rootName}
# eval "${d}(${rootName} completion zsh)"

${functions.join("\n\n")}

_${rootName}() {
  local curcontext="${d}curcontext" state line
  typeset -A opt_args

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case "${d}state" in
    command)
      ${helperPrefix}_${rootName}
      ;;
    args)
      case "${d}{line[1]}" in
${rootSubcases}
      esac
      ;;
  esac
}

_${rootName} "${d}@"
`;
}

function generateFish(program: Command): string {
  const commands = collectCommands(program, "");
  const rootName = program.name();
  const lines: string[] = [`# fish completion for ${rootName}`, `# ${rootName} completion fish | source`];

  for (const cmd of commands) {
    const parts = cmd.name.split(" ");

    if (cmd.name === rootName) {
      for (const sub of cmd.subcommands) {
        lines.push(`complete -c ${rootName} -n "__fish_use_subcommand" -a "${sub}" -d "${sub} command"`);
      }
      for (const opt of cmd.options) {
        const longFlag = opt.replace(/^--/, "");
        lines.push(`complete -c ${rootName} -n "__fish_use_subcommand" -l "${longFlag}"`);
      }
    } else {
      const parentArgs = parts.slice(1);
      const condition =
        parentArgs.length === 1
          ? `__fish_seen_subcommand_from ${parentArgs[0]}`
          : parentArgs.map((a) => `__fish_seen_subcommand_from ${a}`).join("; and ");

      for (const sub of cmd.subcommands) {
        lines.push(`complete -c ${rootName} -n "${condition}" -a "${sub}" -d "${sub} command"`);
      }
      for (const opt of cmd.options) {
        const longFlag = opt.replace(/^--/, "");
        lines.push(`complete -c ${rootName} -n "${condition}" -l "${longFlag}"`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

export function completionCommand(program: Command): Command {
  const cmd = new Command("completion");
  cmd.description("Generate shell completion scripts");
  cmd.argument("<shell>", "shell type (bash, zsh, fish)");

  cmd.addHelpText(
    "after",
    `
Examples:
  eval "$(linkedctl completion bash)"
  linkedctl completion zsh > ~/.zsh/completions/_linkedctl
  linkedctl completion fish | source`,
  );

  cmd.action((shell: string) => {
    switch (shell) {
      case "bash":
        process.stdout.write(generateBash(program));
        break;
      case "zsh":
        process.stdout.write(generateZsh(program));
        break;
      case "fish":
        process.stdout.write(generateFish(program));
        break;
      default:
        console.error(`Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`);
        process.exitCode = 1;
        break;
    }
  });

  return cmd;
}
