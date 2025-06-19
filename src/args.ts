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
  inputModalities?: string[];
  outputModalities?: string[];
  reasoning?: boolean;
  toolCall?: boolean;
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
      i: "input",
      o: "output",
      t: "tool-call",
    },
    boolean: [
      "help",
      "function-calling",
      "vision",
      "reasoning",
      "tool-call",
      "show-all",
      "sort-token",
      "sort-cost",
    ],
    string: [
      "compare",
      "provider",
      "mode",
      "sort-by",
      "group-by",
      "input",
      "output",
    ],
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

  // Handle special sort cases first and normalize sort field names
  if (parsed["sort-token"]) {
    result.sortBy = "max_input_tokens";
  } else if (parsed["sort-cost"]) {
    result.sortBy = "input_cost_per_token";
  } else if (parsed["sort-by"]) {
    // Normalize sort field names
    const sortField = parsed["sort-by"].toLowerCase();
    switch (sortField) {
      case "max_input_tokens": {
        result.sortBy = "max_input_tokens";
        break;
      }
      case "input_cost_per_token": {
        result.sortBy = "input_cost_per_token";
        break;
      }
      default: {
        result.sortBy = sortField;
      }
    }
  } else {
    // No explicit sort flag provided – leave undefined so downstream logic can choose a sensible default
    result.sortBy = undefined;
  }

  // Handle models
  if (Array.isArray(parsed.model)) {
    result.models = parsed.model;
  } else if (parsed.model) {
    result.models = [parsed.model];
  }

  if (parsed.input) {
    result.inputModalities = Array.isArray(parsed.input)
      ? parsed.input
      : [parsed.input];
  }
  if (parsed.output) {
    result.outputModalities = Array.isArray(parsed.output)
      ? parsed.output
      : [parsed.output];
  }

  result.reasoning = parsed.reasoning;
  result.toolCall = parsed["tool-call"] || parsed["function-calling"];

  // vision alias → image input modality
  if (parsed.vision) {
    result.inputModalities = [...(result.inputModalities || []), "image"];
  }

  // Handle group-by validation and default
  if (parsed["group-by"] !== undefined) {
    const validGroupBy = ["type", "provider", "mode", "series"];
    const groupByValue = parsed["group-by"] || "series";

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
