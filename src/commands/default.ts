import { loadModelDb } from "..";
import consola from "consola";
import type { Argv } from "mri";
import { parseArgs, validateArgs, printHelp } from "../args";
import MiniSearch from "minisearch";

interface ModelInfo {
  name: string;
  litellm_provider?: string;
  [key: string]: any;
}

function initializeModelSearch(modelDb: Record<string, any>): MiniSearch {
  console.log("\nInitializing Search:");
  console.log("Total models in DB:", Object.keys(modelDb).length);

  const miniSearch = new MiniSearch({
    fields: ["name", "provider", "mode", "content"],
    storeFields: ["name", "provider", "mode"],
    idField: "name",
    processTerm: (term) => term.toLowerCase(),
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
    },
  });

  const modelDocs = Object.entries(modelDb).map(([name, info]) => ({
    name,
    provider: info.litellm_provider || "",
    mode: info.mode || "",
    content: `${name} ${info.litellm_provider || ""} ${info.mode || ""}`,
  }));

  console.log("Documents prepared:", modelDocs.length);

  miniSearch.addAll(modelDocs);
  console.log("Search index built");

  // Verify a few random models are indexed
  const sampleKeys = Object.keys(modelDb).slice(0, 3);
  console.log("Sample models indexed:", sampleKeys);

  return miniSearch;
}

function formatModelInfo(modelInfo: Record<string, any>): string {
  if (!modelInfo) return "Model not found in database";

  return Object.entries(modelInfo)
    .filter(([key]) => key !== "source")
    .map(([key, value]) => {
      const formattedKey = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (typeof value === "boolean")
        return `${formattedKey}: ${value ? "Yes" : "No"}`;
      if (typeof value === "number")
        return `${formattedKey}: ${value.toLocaleString()}`;
      return `${formattedKey}: ${value}`;
    })
    .join("\n");
}

function searchModels(
  miniSearch: MiniSearch,
  modelDb: Record<string, any>,
  query: string
): ModelInfo[] {
  console.log("\nSearch Debug:");
  console.log("Query:", query);
  console.log("Direct DB lookup:", !!modelDb[query]);

  // First try exact match in modelDb
  if (modelDb[query]) {
    console.log("Found exact match in modelDb");
    return [
      {
        name: query,
        ...modelDb[query],
      },
    ];
  }

  // If no exact match, try fuzzy search
  const searchOptions = {
    fuzzy: 0.3,
    prefix: true,
    boost: {
      name: 3,
      content: 1,
    },
  };

  const results = miniSearch.search(query, searchOptions);
  console.log("MiniSearch results:", results.length);
  console.log("Search options:", searchOptions);

  // Log first 3 results if any
  if (results.length > 0) {
    console.log(
      "Top matches:",
      results.slice(0, 3).map((r) => r.name)
    );
  }

  return results.map((result) => ({
    name: result.name,
    ...modelDb[result.name],
  }));
}

export default async function defaultMain(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  validateArgs(args);
  const modelDb = await loadModelDb();

  console.log("\nCommand Debug:");
  console.log("Models argument:", args.models);
  console.log("Provider argument:", args.provider);
  console.log("Command argument:", args.command);

  const miniSearch = initializeModelSearch(modelDb);

  if (args.provider || args.models.length > 0) {
    const searchQuery = args.provider || args.models.join(" ");
    console.log("\nExecuting search for:", searchQuery);

    const results = searchModels(miniSearch, modelDb, searchQuery);

    if (results.length === 0) {
      consola.error(`No models found for "${searchQuery}"`);
      process.exit(1);
    }

    for (const model of results) {
      consola.box({
        title: `${model.name} (${model.litellm_provider || "Unknown provider"})`,
        message: formatModelInfo(model),
        style: { padding: 1, borderColor: "cyan", borderStyle: "round" },
      });
    }
    return;
  }

  if (args.command) {
    const model = modelDb[args.command];
    if (model) {
      consola.box({
        title: args.command,
        message: formatModelInfo(model),
        style: { padding: 1, borderColor: "cyan", borderStyle: "round" },
      });
      return;
    }

    const results = searchModels(miniSearch, modelDb, args.command);
    if (results.length === 0) {
      consola.error(`No models found matching "${args.command}"`);
      process.exit(1);
    }

    consola.box({
      title: `Models matching "${args.command}"`,
      message: results
        .map(
          (model) =>
            `${model.name} (${model.litellm_provider || "Unknown provider"})`
        )
        .join("\n"),
      style: { padding: 1, borderColor: "cyan", borderStyle: "round" },
    });
    return;
  }
}
