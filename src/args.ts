import mri from "mri";

export interface ParsedArgs {
  help: boolean;
  models: string[];
  provider?: string;
  command?: string;
  functionCalling?: boolean;
  vision?: boolean;
  assistantPrefill?: boolean;
  mode?: string;
  sortBy?: string;
  compare?: string;
  verbose: number;
  showAll: boolean;
  groupBy?: "type" | "provider" | "mode";
}

export function parseArgs(args: string[]): ParsedArgs {
  const argv = mri(args, {
    alias: {
      h: "help",
      p: "provider",
      m: "model",
      c: "compare",
    },
    boolean: [
      "help",
      "function-calling",
      "vision",
      "assistant-prefill",
      "show-all",
    ],
    string: ["provider", "mode", "sort-by", "model", "compare", "group-by"],
    default: {
      help: false,
      showAll: false,
    },
  });

  const result: ParsedArgs = {
    help: argv.help,
    models: [],
    provider: argv.provider,
    command: argv._.length > 0 ? argv._[0].toString() : undefined,
    functionCalling: argv["function-calling"],
    vision: argv.vision,
    assistantPrefill: argv["assistant-prefill"],
    mode: argv.mode,
    sortBy: argv["sort-by"],
    compare: argv.compare,
    verbose: 0,
    showAll: argv["show-all"],
    groupBy: argv["group-by"] as ParsedArgs["groupBy"],
  };

  // Handle sort shortcuts
  if (argv["sort-token"]) {
    result.sortBy = "max_input_tokens";
  } else if (argv["sort-cost"]) {
    result.sortBy = "input_cost_per_token";
  }

  // Handle --model flag
  if (argv.model) {
    const modelArgs = Array.isArray(argv.model) ? argv.model : [argv.model];
    result.models.push(...modelArgs);
  }

  // Handle non-flag arguments as model names
  for (const arg of argv._) {
    const argStr = arg.toString();
    if (!result.command) {
      result.command = argStr;
    }
    result.models.push(argStr);
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--verbose": {
        const level = Number.parseInt(args[i + 1]);
        result.verbose = Number.isNaN(level) ? 1 : level;
        i++;
        break;
      }
    }
  }

  return result;
}

export function printHelp(): void {
  console.log(`
Usage: llm-compare [options] [model-name]

Options:
  --help                  Show this help message
  -m, --model <name>     Search for specific model(s)
  --provider <name>      Filter by provider
  --function-calling     Show only models that support function calling
  --vision              Show only models that support vision
  --assistant-prefill   Show only models that support assistant prefill
  --mode <type>         Filter by mode (embedding, chat, completion, rerank, etc)
  --sort-token          Sort by max input tokens (descending)
  --sort-cost           Sort by input cost per token (descending)
  --sort-by <field>     Sort by specific field (max_tokens, max_input_tokens, etc)
  --group-by <criteria> Group results by: type, provider, or mode
  --show-all           Show all versions of models (including older ones)
  -c, --compare <models>  Compare multiple models (comma-separated)
  --verbose [level]    Show debug output (default level: 1, max: 2)

Examples:
  llm-compare gpt-4 --verbose 2     Show detailed debug info while searching for gpt-4
  llm-compare --group-by provider   Group models by their providers
  llm-compare --compare "gpt-4,claude-2" --verbose 2   Show debug info during comparison
`);
}
