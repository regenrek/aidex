import { readFileSync } from "node:fs";
import { resolve, dirname } from "pathe";
import { parseTOML } from "confbox";
import { fileURLToPath } from "node:url";

const MODELDB_URL =
  "https://raw.githubusercontent.com/regenrek/aidex/main/modeldb.json";

interface SeriesRule {
  name: string;
  pattern: string;
  patterns?: string[];
}

interface ProviderRules {
  series: SeriesRule[];
}

interface ModelRules {
  [provider: string]: ProviderRules;
}

let modelRules: ModelRules | null = null;

export function loadModelRules(): ModelRules {
  if (modelRules) return modelRules;

  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rulesPath = resolve(__dirname, "../modelrules.toml");
    const content = readFileSync(rulesPath, "utf8");
    modelRules = parseTOML(content) as ModelRules;
    return modelRules;
  } catch (error) {
    console.error("Failed to load model rules:", error);
    return {};
  }
}

export function getModelSeries(modelName: string, provider: string): string {
  const rules = loadModelRules()[provider];
  if (!rules?.series) return "unknown";

  for (const rule of rules.series) {
    // Handle multiple patterns
    const patterns = rule.patterns || [rule.pattern];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern);
      if (regex.test(modelName)) {
        return rule.name;
      }
    }
  }

  return "other";
}

export async function loadModelDb(): Promise<Record<string, any>> {
  const response = await fetch(MODELDB_URL).catch(() => null);
  if (!response?.ok) return {};

  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  return data;
}
