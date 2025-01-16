import mri from "mri";
import type { Argv } from "mri";

export interface ParsedArgs {
  models: string[];
  compareModels: string[];
  command?: string;
  help: boolean;
  provider?: string;
}

export function parseArgs(args: string[]): ParsedArgs {
  const argv = mri(args, {
    alias: {
      m: "model",
      h: "help",
      p: "provider",
      c: "compare",
    },
    boolean: ["h", "help"],
    string: ["provider", "model", "compare"],
    default: {
      model: [],
      compare: "",
      help: false,
    },
  });

  // Normalize model arguments to always be an array
  const normalizeModels = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  };

  // Handle both --model and -m flags, combining them if both are used
  const modelFlags = [
    ...normalizeModels(argv.model),
    ...normalizeModels(argv.m),
  ];

  // Handle compare flag, splitting on commas if present
  const compareModels = argv.compare
    ? argv.compare.toString().split(",").filter(Boolean)
    : [];

  // Remove empty strings and duplicates
  const models = [...new Set(modelFlags.filter(Boolean))];

  return {
    models,
    compareModels,
    command: argv._.length > 0 ? argv._[0].toString() : undefined,
    help: Boolean(argv.help || argv.h),
    provider: argv.provider?.toString(),
  };
}

export function validateArgs(parsed: ParsedArgs): void {
  if (parsed.models.length > 0 && parsed.compareModels.length > 0) {
    throw new Error("Cannot use both --model and --compare flags together");
  }

  if (parsed.compareModels.length === 1) {
    throw new Error("--compare requires at least two models");
  }

  if (parsed.models.length > 0 && parsed.provider) {
    throw new Error("Cannot use both --model and --provider flags together");
  }
}

export function printHelp() {
  console.log(`
Usage: aidex [command] [options]

Commands:
  <model>                   Get info about specific model (e.g., gpt-4, gemini)
  latest                    Show all latest models
  preview                   Show all preview models
  all                      Show all available models

Options:
  -m, --model <model>      Search for models (can be used multiple times)
  --provider <provider>    Filter by provider (e.g., openai, anthropic)
  -c, --compare <m1,m2>   Compare multiple models (comma-separated)
  -h, --help              Display this help message

Examples:
  npx aidex --model gemini
  npx aidex --model gpt4 --model preview
  npx aidex --provider openai
  npx aidex --compare gpt4,claude,gemini
  npx aidex gpt-4          # Direct model lookup`);
}
