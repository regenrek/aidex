import mri from "mri";

export interface ParsedArgs {
  command?: string;
  models: string[];
  help: boolean;
  compare?: string;
  provider?: string;
  functionCalling?: boolean;
  vision?: boolean;
  mode?: string;
  sortBy?: string;
  groupBy?: string;
  showAll: boolean;
  verbose: number;
  _: string[];
}

export function parseArgs(args: string[]): ParsedArgs {
  const parsed = mri(args, {
    alias: {
      h: "help",
      c: "compare",
      p: "provider",
      f: "function-calling",
      v: "vision",
      m: "model",
      s: "sort-by",
      g: "group-by",
    },
    boolean: ["help", "function-calling", "vision", "show-all"],
    string: ["compare", "provider", "mode", "sort-by", "group-by"],
    default: {
      help: false,
      models: [],
      showAll: false,
      verbose: 0,
    },
  });

  const result: ParsedArgs = {
    help: parsed.help,
    models: [],
    showAll: parsed["show-all"],
    verbose: parsed.verbose || 0,
    compare: parsed.compare,
    provider: parsed.provider,
    functionCalling: parsed["function-calling"],
    vision: parsed.vision,
    mode: parsed.mode,
    _: parsed._,
  };

  // Handle special sort cases
  if (parsed["sort-token"]) {
    result.sortBy = "max_input_tokens";
  } else if (parsed["sort-cost"]) {
    result.sortBy = "input_cost_per_token";
  } else {
    result.sortBy = parsed["sort-by"];
  }

  // Handle models
  if (Array.isArray(parsed.model)) {
    result.models = parsed.model;
  } else if (parsed.model) {
    result.models = [parsed.model];
  }

  // Handle group-by validation and default
  if (parsed["group-by"]) {
    const validGroupBy = ["type", "provider", "mode", "series"];
    const groupByValue = parsed["group-by"];

    if (!validGroupBy.includes(groupByValue)) {
      console.error(
        `Invalid --group-by value. Must be one of: ${validGroupBy.join(", ")}`
      );
      process.exit(1);
    }
    result.groupBy = groupByValue;
  }

  // Handle command and additional models from positional args
  if (parsed._.length > 0) {
    result.command = parsed._[0];
    result.models.push(...parsed._.slice(1));
  }

  return result;
}

export function printHelp(): void {
  console.log(`
Usage: aidex [options] [search terms]

Options:
  --help, -h                  Show this help message
  -m, --model <name>     Search for specific model(s)
  -p, --provider <name>  Filter by provider
  --function-calling     Show only models that support function calling
  --vision              Show only models that support vision
  --mode <type>         Filter by mode (embedding, chat, completion, rerank, etc)
  --sort-token          Sort by max input tokens (descending)
  --sort-cost           Sort by input cost per token (descending)
  --sort-by <field>     Sort by specific field (max_tokens, max_input_tokens, etc)
  --group-by <criteria> Group results by: type, provider, mode, or series
  --show-all           Show all versions of models (including older ones)
  -c, --compare <models>  Compare multiple models (comma-separated)
  --verbose [level]    Show debug output (default level: 1, max: 2)
`);
}
