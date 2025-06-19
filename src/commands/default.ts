// src/commands/default.ts
import { loadModelDb } from "..";
import { parseArgs, printHelp, type ParsedArgs } from "../args";
import MiniSearch from "minisearch";
import tableize from "../table";
import pc from "picocolors";
import { getModelSeries } from "../model-db";

interface ModelInfo {
  name: string;
  litellm_provider?: string;
  [key: string]: any;
}

interface SearchOptions {
  provider?: string;
  functionCalling?: boolean; // legacy
  vision?: boolean; // legacy
  reasoning?: boolean;
  toolCall?: boolean;
  inputModalities?: string[];
  outputModalities?: string[];
  mode?: string;
  sortBy?: string;
}

interface ComparisonField {
  field: string;
  label: string;
  higher_is_better: boolean;
  format?: (value: any) => string;
}

interface OrderedSeries {
  [provider: string]: string[];
}

interface SortConfig {
  field: string;
  higherIsBetter: boolean;
}

function getSeriesOrder(): OrderedSeries {
  // The previous implementation relied on a `rules` object that has been
  // removed from the codebase. Returning an empty object keeps the
  // existing call-sites working while deferring to `getModelSeries` for
  // classification.
  return {};
}

function formatTokens(tokens?: number): string {
  if (!tokens) return "N/A";
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toLocaleString()}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toLocaleString()}k`;
  }
  return tokens.toLocaleString();
}

function formatCost(cost?: number): string {
  if (!cost) return "$0.00";
  // Convert to cost per million tokens
  const perMillion = cost * 1_000_000;
  if (perMillion >= 1) {
    return `$${perMillion.toFixed(2)}`;
  }
  return `$${perMillion.toFixed(3)}`;
}

function formatModalities(mods: string[] | undefined): string {
  if (!mods?.length) return "—";
  const map: Record<string, string> = {
    text: "📝",
    image: "📷",
    audio: "🔊",
    video: "🎥",
  };
  return mods.map((m) => map[m] ?? m[0]).join("");
}

const COMPARISON_FIELDS: ComparisonField[] = [
  {
    field: "litellm_provider",
    label: "Provider",
    higher_is_better: false,
    format: (v) => v || "Unknown",
  },
  {
    field: "knowledge",
    label: "Cutoff",
    higher_is_better: true,
    format: (v) => v || "—",
  },
  {
    field: "input_modalities",
    label: "In 📥",
    higher_is_better: false,
    format: formatModalities,
  },
  {
    field: "output_modalities",
    label: "Out 📤",
    higher_is_better: false,
    format: formatModalities,
  },
  {
    field: "reasoning",
    label: "Reason",
    higher_is_better: true,
    format: (v) => (v ? "✓" : "×"),
  },
  {
    field: "tool_call",
    label: "Tools",
    higher_is_better: true,
    format: (v) => (v ? "✓" : "×"),
  },
  {
    field: "max_input_tokens",
    label: "Ctx Tok",
    higher_is_better: true,
    format: formatTokens,
  },
  {
    field: "max_output_tokens",
    label: "Out Tok",
    higher_is_better: true,
    format: formatTokens,
  },
  {
    field: "input_cost_per_token",
    label: "$/1M In",
    higher_is_better: false,
    format: formatCost,
  },
  {
    field: "output_cost_per_token",
    label: "$/1M Out",
    higher_is_better: false,
    format: formatCost,
  },
  {
    field: "cache_read_cost_per_token",
    label: "$/1M Cache R",
    higher_is_better: false,
    format: formatCost,
  },
  {
    field: "cache_write_cost_per_token",
    label: "$/1M Cache W",
    higher_is_better: false,
    format: formatCost,
  },
];

let globalVerboseLevel = 0;

function debug(level: number, ...args: any[]): void {
  if (globalVerboseLevel >= level) {
    console.log(...args);
  }
}

function initializeModelSearch(modelDb: Record<string, any>): MiniSearch {
  debug(2, "\nInitializing Search:");
  debug(2, "Total models in DB:", Object.keys(modelDb).length);

  const miniSearch = new MiniSearch({
    fields: ["name", "provider", "mode", "content"],
    storeFields: ["name", "provider", "mode"],
    idField: "name",
    processTerm: (term) => term.toLowerCase(),
    tokenize: (string, _fieldName) => string.split(/[\s,]+/),
    searchOptions: {
      prefix: false,
      boost: {
        name: 3,
        content: 1,
      },
    },
  });

  const modelDocs = Object.entries(modelDb).map(([name, info]) => ({
    name,
    provider: info.litellm_provider || "",
    mode: info.mode || "",
    content: `${name} ${info.litellm_provider || ""} ${info.mode || ""}`,
  }));

  debug(2, "Documents prepared:", modelDocs.length);
  miniSearch.addAll(modelDocs);
  debug(2, "Search index built");

  const sampleKeys = Object.keys(modelDb).slice(0, 3);
  debug(2, "Sample models indexed:", sampleKeys);

  return miniSearch;
}

function filterLegacyModels(
  models: ModelInfo[],
  showAll: boolean
): ModelInfo[] {
  if (showAll) return models;

  return models.filter((model) => {
    const provider = model.litellm_provider?.toLowerCase() || "unknown";
    const series = getModelSeries(model.name, provider);
    return series !== "legacy";
  });
}

function getSortConfig(sortBy: string): SortConfig {
  switch (sortBy) {
    case "input_cost_per_token":
    case "output_cost_per_token": {
      return { field: sortBy, higherIsBetter: false };
    }
    case "max_input_tokens":
    case "max_output_tokens": {
      return { field: sortBy, higherIsBetter: true };
    }
    default: {
      return { field: sortBy, higherIsBetter: true };
    }
  }
}

function searchModels(
  miniSearch: MiniSearch,
  modelDb: Record<string, any>,
  query: string,
  options: SearchOptions = {},
  args: ParsedArgs
): ModelInfo[] {
  debug(2, "\nSearch Debug:");
  debug(2, "Query:", query);
  debug(2, "Search options:", options);

  // First try exact match in modelDb
  // if (modelDb[query]) {
  //   const model = {
  //     name: query,
  //     ...modelDb[query],
  //   };
  //   return filterLegacyModels([model], args.showAll);
  // }

  // If no exact match, try prefix search
  const searchQuery = query.toLowerCase();
  let results = Object.entries(modelDb)
    .filter(([name]) => name.toLowerCase().startsWith(searchQuery))
    .map(([name, info]) => ({
      name,
      ...info,
    }));

  // If no prefix matches, try fuzzy search as fallback
  if (results.length === 0) {
    results = miniSearch
      .search(query, {
        fuzzy: 0.2,
        prefix: true,
        boost: {
          name: 3,
          content: 1,
        },
      })
      .map((result) => ({
        name: result.name,
        ...modelDb[result.name],
      }));
  }

  // Filter out legacy models and apply other filters
  results = filterLegacyModels(results, args.showAll);

  // Apply other filters
  if (options.provider) {
    const providerList = options.provider
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    results = results.filter((model) => {
      const provider = model.litellm_provider?.toLowerCase() || "";
      return providerList.some((p) => provider.includes(p));
    });
  }

  if (options.functionCalling) {
    results = results.filter(
      (model) => model.supports_function_calling === true
    );
  }

  if (options.vision) {
    results = results.filter((model) => model.supports_vision === true);
  }

  if (options.reasoning) {
    results = results.filter((m) => m.reasoning === true);
  }
  if (options.toolCall) {
    results = results.filter((m) => m.tool_call === true);
  }
  if (options.inputModalities?.length) {
    results = results.filter((m) =>
      options.inputModalities!.every((mod) => m.input_modalities?.includes(mod))
    );
  }
  if (options.outputModalities?.length) {
    results = results.filter((m) =>
      options.outputModalities!.every((mod) =>
        m.output_modalities?.includes(mod)
      )
    );
  }

  if (options.mode) {
    results = results.filter(
      (model) => model.mode?.toLowerCase() === options.mode!.toLowerCase()
    );
  }

  // Apply sorting
  if (options.sortBy) {
    const sortConfig = getSortConfig(options.sortBy);
    results.sort((a, b) => {
      const aValue = a[sortConfig.field] ?? 0;
      const bValue = b[sortConfig.field] ?? 0;
      return sortConfig.higherIsBetter ? bValue - aValue : aValue - bValue;
    });
  } else {
    // Default sort by knowledge cutoff date when no explicit sort provided
    results.sort(
      (a, b) =>
        parseKnowledgeDate(b.knowledge) - parseKnowledgeDate(a.knowledge)
    );
  }

  return results;
}

// Add a helper to strip ANSI codes for width calculation
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B\[[0-9;]*[a-zA-Z]/g, "");
}

function parseKnowledgeDate(knowledge?: string): number {
  if (!knowledge) return 0;
  let str = knowledge.trim();
  // Convert YYYYMMDD to ISO format for consistent parsing
  if (/^\d{8}$/.test(str)) {
    str = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  const ts = Date.parse(str);
  return Number.isNaN(ts) ? 0 : ts;
}

function groupModels(models: ModelInfo[]): ModelInfo[] {
  if (models.length === 0) return models;

  // Group models by their base name and date
  const modelGroups = new Map<string, ModelInfo[]>();
  const modelsWithoutDates: ModelInfo[] = [];

  // Preserve input order by using the original array order
  for (const model of models) {
    // First check if model has a date pattern
    const dateMatch = model.name.match(
      /[-_](\d{4}-\d{2}-\d{2}|\d{8})(?:$|[-_])/
    );

    // If no date pattern, keep the model in original order
    if (!dateMatch) {
      modelsWithoutDates.push(model);
      continue;
    }

    // Extract base name by removing the date part
    const baseName = model.name.slice(0, dateMatch.index);
    if (!baseName) {
      modelsWithoutDates.push(model);
      continue;
    }

    if (!modelGroups.has(baseName)) {
      modelGroups.set(baseName, []);
    }
    modelGroups.get(baseName)!.push(model);
  }

  // For each group, keep only the latest version while preserving relative order
  const latestVersions = [...modelGroups.values()].flatMap((group) => {
    if (group.length === 1) return group;

    // Sort by date descending, handling both formats
    group.sort((a, b) => {
      const dateA = a.name.match(/\d{4}-\d{2}-\d{2}|\d{8}/)?.[0] || "";
      const dateB = b.name.match(/\d{4}-\d{2}-\d{2}|\d{8}/)?.[0] || "";

      // Convert YYYYMMDD to YYYY-MM-DD for comparison
      const normalizedA =
        dateA.length === 8
          ? `${dateA.slice(0, 4)}-${dateA.slice(4, 6)}-${dateA.slice(6, 8)}`
          : dateA;
      const normalizedB =
        dateB.length === 8
          ? `${dateB.slice(0, 4)}-${dateB.slice(4, 6)}-${dateB.slice(6, 8)}`
          : dateB;

      return normalizedB.localeCompare(normalizedA);
    });

    return [group[0]]; // Return only the latest version
  });

  // Combine models without dates and latest versions in original relative order
  const result: ModelInfo[] = [];
  const seenModels = new Set<string>();

  // Add models in original order if they're either in modelsWithoutDates or latestVersions
  for (const model of models) {
    if (
      !seenModels.has(model.name) &&
      (modelsWithoutDates.some((m) => m.name === model.name) ||
        latestVersions.some((m) => m.name === model.name))
    ) {
      result.push(model);
      seenModels.add(model.name);
    }
  }

  return result;
}

function compareModels(models: ModelInfo[], args: ParsedArgs): string {
  let processedModels = [...models];
  let output = "";
  let hiddenCount = 0;

  // Default sort by knowledge cutoff date (latest first) if no --sort-by flag is provided
  if (!args.sortBy) {
    processedModels.sort(
      (a, b) =>
        parseKnowledgeDate(b.knowledge) - parseKnowledgeDate(a.knowledge)
    );
  }

  // Debug sorting
  if (args.verbose > 0 && args.sortBy) {
    console.log("\nDebug: Sorting values before sort:");
    for (const model of processedModels) {
      console.log(`${model.name}: ${args.sortBy}=${model[args.sortBy!]}`);
    }
  }

  // Apply explicit sorting when --sort-by is provided (overrides default)
  if (args.sortBy) {
    const sortConfig = getSortConfig(args.sortBy);
    processedModels.sort((a, b) => {
      const aValue = a[sortConfig.field] ?? 0;
      const bValue = b[sortConfig.field] ?? 0;
      return sortConfig.higherIsBetter ? bValue - aValue : aValue - bValue;
    });

    if (args.verbose > 0) {
      console.log("\nDebug: Sorting values after sort:");
      for (const model of processedModels) {
        console.log(`${model.name}: ${args.sortBy}=${model[args.sortBy!]}`);
      }
    }
  }

  // Filter out legacy models early if --show-all is not set
  if (!args.showAll) {
    const beforeCount = processedModels.length;
    const provider =
      processedModels[0]?.litellm_provider?.toLowerCase() || "unknown";
    processedModels = processedModels.filter((model) => {
      const series = getModelSeries(model.name, provider);
      return series !== "legacy";
    });
    hiddenCount = beforeCount - processedModels.length;
  }

  if (args.groupBy) {
    let groups: Record<string, ModelInfo[]>;

    switch (args.groupBy) {
      case "type": {
        groups = {
          latest: processedModels.filter(
            (m) =>
              !["preview", "vision", "realtime", "audio"].some((type) =>
                m.name.includes(type)
              )
          ),
          preview: processedModels.filter((m) => m.name.includes("preview")),
          vision: processedModels.filter((m) => m.name.includes("vision")),
          realtime: processedModels.filter((m) => m.name.includes("realtime")),
          audio: processedModels.filter((m) => m.name.includes("audio")),
        };
        break;
      }
      case "provider": {
        groups = {};
        for (const model of processedModels) {
          const provider = model.litellm_provider || "unknown";
          if (!groups[provider]) groups[provider] = [];
          groups[provider].push(model);
        }
        break;
      }
      case "mode": {
        groups = {};
        for (const model of processedModels) {
          const mode = model.mode || "unknown";
          if (!groups[mode]) groups[mode] = [];
          groups[mode].push(model);
        }
        break;
      }
      case "series": {
        const seriesOrder = getSeriesOrder();
        groups = {};

        const provider =
          processedModels[0]?.litellm_provider?.toLowerCase() || "unknown";
        const orderList = seriesOrder[provider] || [];

        for (const series of orderList) {
          groups[series] = [];
        }
        groups["other"] = [];

        for (const model of processedModels) {
          const provider = model.litellm_provider?.toLowerCase() || "unknown";
          const series = getModelSeries(model.name, provider);

          if (!groups[series]) groups[series] = [];
          groups[series].push(model);
        }

        // Remove empty groups
        for (const key of Object.keys(groups)) {
          if (groups[key].length === 0) delete groups[key];
        }
        break;
      }
      default: {
        return generateTable(processedModels);
      }
    }

    // Apply default cutoff-date sorting within each group when no --sort-by flag is provided
    if (!args.sortBy) {
      for (const key of Object.keys(groups)) {
        groups[key].sort(
          (a, b) =>
            parseKnowledgeDate(b.knowledge) - parseKnowledgeDate(a.knowledge)
        );
      }
    }

    // Filter out older versions unless showAll is true
    if (!args.showAll) {
      const beforeCount = Object.values(groups).flat().length;
      for (const key of Object.keys(groups)) {
        groups[key] = groupModels(groups[key]);
      }
      const afterCount = Object.values(groups).flat().length;
      hiddenCount = beforeCount - afterCount;
    }

    // Combine all groups with headers
    for (const [groupName, groupModels] of Object.entries(groups)) {
      if (groupModels.length > 0) {
        output += `\n${pc.bold(groupName)} Models:\n`;
        output += generateTable(groupModels);
        output += "\n";
      }
    }
  } else {
    // No grouping, but still handle showAll flag
    if (!args.showAll) {
      const beforeCount = processedModels.length;
      const groupedModels = groupModels(processedModels);
      hiddenCount += beforeCount - groupedModels.length;
      processedModels = groupedModels;
    }
    output = generateTable(processedModels);
  }

  // Add summary section
  output += "\n\nSummary:";
  if (hiddenCount > 0) {
    output += `\n${pc.yellow(`${hiddenCount} entries hidden`)} (older models) - use --show-all to see all versions`;
  }
  if (!args.groupBy) {
    output += `\n${pc.dim("Tip: Use --group-by type|provider|mode to organize results")}`;
  }
  if (!args.sortBy) {
    output += `\n${pc.dim("Tip: Use --sort-by <field> or --sort-token/--sort-cost to sort results")}`;
  }

  return output;
}

// Move the table generation logic to a separate function
function generateTable(models: ModelInfo[]): string {
  // Create a copy of the models array to preserve the original order
  const orderedModels = [...models];

  const columnWidths = ["Model", ...COMPARISON_FIELDS.map((f) => f.label)].map(
    (header, colIndex) => {
      let maxWidth = header.length;
      // Use orderedModels to calculate widths
      for (const model of orderedModels) {
        const content =
          colIndex === 0
            ? model.name
            : COMPARISON_FIELDS[colIndex - 1].format?.(
                model[COMPARISON_FIELDS[colIndex - 1].field]
              ) || "";
        // Strip ANSI codes when calculating width
        maxWidth = Math.max(maxWidth, stripAnsi(content.toString()).length);
      }
      return maxWidth;
    }
  );

  const headers = ["Model", ...COMPARISON_FIELDS.map((f) => f.label)];
  const rows: string[][] = [];

  // Use orderedModels to generate rows in the same order
  for (const model of orderedModels) {
    const row = [model.name];

    for (const field of COMPARISON_FIELDS) {
      const value = model[field.field];
      const formattedValue = field.format?.(value) || value;

      if (typeof value === "number" && orderedModels.length > 1) {
        const values = orderedModels
          .map((m) => m[field.field])
          .filter((v) => typeof v === "number");
        const bestValue = field.higher_is_better
          ? Math.max(...values)
          : Math.min(...values);
        row.push(
          value === bestValue
            ? pc.green(formattedValue.toString())
            : pc.gray(formattedValue.toString())
        );
      } else if (typeof value === "boolean") {
        row.push(
          value
            ? pc.green(formattedValue.toString())
            : pc.gray(formattedValue.toString())
        );
      } else {
        row.push(formattedValue.toString());
      }
    }
    rows.push(row);
  }

  return tableize({
    headers,
    rows,
    columnWidths,
  });
}

export default async function defaultMain(): Promise<void> {
  const args: ParsedArgs = parseArgs(process.argv.slice(2));

  // Update validation for --group-by usage
  if (args.groupBy && !args.models?.length && !args.provider) {
    console.error(
      "--group-by can only be used with --model or --provider flag"
    );
    process.exit(1);
  }

  // Set global verbose level
  globalVerboseLevel = args.verbose;

  if (args.help) {
    printHelp();
    return;
  }

  const modelDb = await loadModelDb();
  const miniSearch = initializeModelSearch(modelDb);

  // Handle comparison mode
  if (args.compare) {
    const modelQueries = args.compare.split(",").map((m) => m.trim());
    const allMatchingModels: ModelInfo[] = [];

    // Use existing search function for each model query
    for (const query of modelQueries) {
      const searchResults = searchModels(miniSearch, modelDb, query, {}, args);

      if (searchResults.length === 0) {
        console.error(`No models found matching: ${query}`);
        process.exit(1);
      }

      // Add all matching models instead of just the first one
      allMatchingModels.push(...searchResults);
    }

    // Remove duplicates if any
    const uniqueModels = allMatchingModels.filter(
      (model, index, self) =>
        index === self.findIndex((m) => m.name === model.name)
    );

    if (uniqueModels.length < 2) {
      console.error("Please provide at least 2 different models to compare");
      process.exit(1);
    }

    console.log("\nModel Comparison:");
    console.log(compareModels(uniqueModels, args));
    return;
  }

  const searchOptions: SearchOptions = {
    provider: args.provider,
    functionCalling: args.functionCalling,
    vision: args.vision,
    reasoning: args.reasoning,
    toolCall: args.toolCall,
    inputModalities: args.inputModalities,
    outputModalities: args.outputModalities,
    mode: args.mode,
    sortBy: args.sortBy,
  };

  const searchQuery = args.command || args.models.join(" ") || "";
  const results = searchModels(
    miniSearch,
    modelDb,
    searchQuery,
    searchOptions,
    args
  );

  if (results.length === 0) {
    console.error(`No models found matching the specified criteria`);
    process.exit(1);
  }

  // Display results - reuse comparison table for all displays
  const uniqueModels = results.filter(
    (model, index, self) =>
      index === self.findIndex((m) => m.name === model.name)
  );

  console.log("\nModel Details:");
  console.log(compareModels(uniqueModels, args));
}
