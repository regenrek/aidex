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
}

export function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    models: [],
    help: false,
    showAll: false,
    verbose: 0,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-h":
      case "--help": {
        parsed.help = true;
        break;
      }
      case "-c":
      case "--compare": {
        parsed.compare = args[++i];
        break;
      }
      case "-p":
      case "--provider": {
        parsed.provider = args[++i];
        break;
      }
      case "-f":
      case "--function-calling": {
        parsed.functionCalling = true;
        break;
      }
      case "-v":
      case "--vision": {
        parsed.vision = true;
        break;
      }
      case "-m":
      case "--model": {
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          parsed.models.push(args[++i]);
        }
        break;
      }
      case "-s":
      case "--sort-by": {
        parsed.sortBy = args[++i];
        break;
      }
      case "--sort-token": {
        parsed.sortBy = "max_input_tokens";
        break;
      }
      case "--sort-cost": {
        parsed.sortBy = "input_cost_per_token";
        break;
      }
      case "-g":
      case "--group-by": {
        if (
          parsed.models.length === 0 &&
          !args.includes("--model") &&
          !args.includes("-m")
        ) {
          console.error("--group-by can only be used with --model flag");
          process.exit(1);
        }
        // Make "series" the default if no value is provided
        parsed.groupBy =
          i + 1 < args.length && !args[i + 1].startsWith("-")
            ? args[++i]
            : "series";
        break;
      }
      case "--show-all": {
        parsed.showAll = true;
        break;
      }
      case "--verbose": {
        parsed.verbose++;
        break;
      }
      case "--mode": {
        parsed.mode = args[++i];
        break;
      }
      default: {
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        if (parsed.command) {
          parsed.models.push(arg);
        } else {
          parsed.command = arg;
        }
      }
    }
  }

  return parsed;
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
