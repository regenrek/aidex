// src/commands/default.ts
import { loadModelDb } from "..";
import { parseArgs, printHelp, type ParsedArgs } from "../args";
import MiniSearch from "minisearch";
import tableize from "../table";
import pc from "picocolors";

interface ModelInfo {
  name: string;
  litellm_provider?: string;
  [key: string]: any;
}

interface SearchOptions {
  provider?: string;
  functionCalling?: boolean;
  vision?: boolean;
  assistantPrefill?: boolean;
  mode?: string;
  sortBy?: string;
}

interface ComparisonField {
  field: string;
  label: string;
  higher_is_better: boolean;
  format?: (value: any) => string;
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

const COMPARISON_FIELDS: ComparisonField[] = [
  {
    field: "litellm_provider",
    label: "Provider",
    higher_is_better: false,
    format: (v) => v || "Unknown",
  },
  {
    field: "mode",
    label: "Mode",
    higher_is_better: false,
    format: (v) => v || "Unknown",
  },
  {
    field: "max_input_tokens",
    label: "In Tok",
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
    field: "supports_vision",
    label: "Vision",
    higher_is_better: true,
    format: (v) => (v ? "✓" : "×"),
  },
  {
    field: "supports_function_calling",
    label: "Functions",
    higher_is_better: true,
    format: (v) => (v ? "✓" : "×"),
  },
];

// Add debug logging helper
function debug(level: number, ...args: any[]): void {
  if (globalVerboseLevel >= level) {
    console.log(...args);
  }
}

// Add global variable to store verbose level
let globalVerboseLevel = 0;

function initializeModelSearch(modelDb: Record<string, any>): MiniSearch {
  debug(2, "\nInitializing Search:");
  debug(2, "Total models in DB:", Object.keys(modelDb).length);

  const miniSearch = new MiniSearch({
    fields: ["name", "provider", "mode", "content"],
    storeFields: ["name", "provider", "mode"],
    idField: "name",
    processTerm: (term) => term.toLowerCase(),
    tokenize: (string, _fieldName) => {
      // Only tokenize by full model names or exact words
      return string.split(/[\s,]+/);
    },
    searchOptions: {
      // Removed fuzzy matching as default
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

  // Verify a few random models are indexed
  const sampleKeys = Object.keys(modelDb).slice(0, 3);
  debug(2, "Sample models indexed:", sampleKeys);

  return miniSearch;
}

function searchModels(
  miniSearch: MiniSearch,
  modelDb: Record<string, any>,
  query: string,
  options: SearchOptions = {}
): ModelInfo[] {
  debug(2, "\nSearch Debug:");
  debug(2, "Query:", query);
  debug(2, "Search options:", options);

  // First try exact match in modelDb
  if (modelDb[query]) {
    debug(2, "Found exact match in modelDb");
    return [
      {
        name: query,
        ...modelDb[query],
      },
    ];
  }

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

  // Apply filters
  if (options.provider) {
    results = results.filter((model) =>
      model.litellm_provider
        ?.toLowerCase()
        .includes(options.provider!.toLowerCase())
    );
  }

  if (options.functionCalling) {
    results = results.filter(
      (model) => model.supports_function_calling === true
    );
  }

  if (options.vision) {
    results = results.filter((model) => model.supports_vision === true);
  }

  if (options.assistantPrefill) {
    results = results.filter(
      (model) => model.supports_assistant_prefill === true
    );
  }

  if (options.mode) {
    results = results.filter(
      (model) => model.mode?.toLowerCase() === options.mode!.toLowerCase()
    );
  }

  // Apply sorting
  if (options.sortBy) {
    const sortField = options.sortBy;
    results.sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;
      return bValue - aValue; // Descending order
    });
  }

  return results;
}

// Add a helper to strip ANSI codes for width calculation
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B\[[0-9;]*[a-zA-Z]/g, "");
}

function groupModels(models: ModelInfo[]): ModelInfo[] {
  if (models.length === 0) return models;

  // Group models by their base name and date
  const modelGroups = new Map<string, ModelInfo[]>();
  const modelsWithoutDates: ModelInfo[] = [];

  for (const model of models) {
    // First check if model has a date pattern
    const dateMatch = model.name.match(
      /[-_](\d{4}-\d{2}-\d{2}|\d{8})(?:$|[-_])/
    );

    // If no date pattern, keep the model
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

  // For each group, keep only the latest version
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

    return group[0]; // Return only the latest version
  });

  // Combine models without dates and latest versions
  return [...modelsWithoutDates, ...latestVersions];
}

function compareModels(models: ModelInfo[], args: ParsedArgs): string {
  let processedModels = [...models];
  const originalCount = models.length;
  let output = "";
  let hiddenCount = 0;

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
        groups = processedModels.reduce(
          (acc, model) => {
            const provider = model.litellm_provider || "unknown";
            if (!acc[provider]) acc[provider] = [];
            acc[provider].push(model);
            return acc;
          },
          {} as Record<string, ModelInfo[]>
        );
        break;
      }
      case "mode": {
        groups = processedModels.reduce(
          (acc, model) => {
            const mode = model.mode || "unknown";
            if (!acc[mode]) acc[mode] = [];
            acc[mode].push(model);
            return acc;
          },
          {} as Record<string, ModelInfo[]>
        );
        break;
      }
      default: {
        return generateTable(processedModels);
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
        output += `\n${pc.bold(groupName.toUpperCase())} Models:\n`;
        output += generateTable(groupModels);
        output += "\n";
      }
    }
  } else {
    // No grouping, but still handle showAll flag
    if (!args.showAll) {
      const beforeCount = processedModels.length;
      processedModels = groupModels(processedModels);
      hiddenCount = beforeCount - processedModels.length;
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
  // Sort models by input tokens (desc) and then by input cost (asc)
  models.sort((a, b) => {
    const aTokens = a.max_input_tokens || 0;
    const bTokens = b.max_input_tokens || 0;
    if (aTokens !== bTokens) return bTokens - aTokens;

    const aCost = a.input_cost_per_token || 0;
    const bCost = b.input_cost_per_token || 0;
    return aCost - bCost;
  });

  const columnWidths = ["Model", ...COMPARISON_FIELDS.map((f) => f.label)].map(
    (header, colIndex) => {
      let maxWidth = header.length;
      for (const model of models) {
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

  for (const model of models) {
    const row = [model.name];

    for (const [fieldIdx, field] of COMPARISON_FIELDS.entries()) {
      const value = model[field.field];
      const formattedValue = field.format?.(value) || value;

      if (typeof value === "number" && models.length > 1) {
        const values = models
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
      const searchResults = searchModels(miniSearch, modelDb, query);

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
    assistantPrefill: args.assistantPrefill,
    mode: args.mode,
    sortBy: args.sortBy,
  };

  const searchQuery = args.command || args.models.join(" ") || "";
  const results = searchModels(miniSearch, modelDb, searchQuery, searchOptions);

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
