import { fetch } from "node-fetch-native";

const MODELDB_URL = "https://models.dev/api.json";

interface RawModel {
  id: string;
  name: string;
  provider: string;
  knowledge?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  reasoning?: boolean;
  tool_call?: boolean;
  pricing?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limits?: {
    context?: number;
    output?: number;
  };
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
  [key: string]: any;
}

/**
 * Flatten the raw model into the shape expected by the rest of the CLI.
 * Back‑compat aliases (supports_vision, supports_function_calling, etc.)
 * are provided so existing filters continue to work unchanged.
 */
function flatten(model: RawModel): Record<string, any> {
  const {
    id,
    name,
    provider,
    knowledge,
    input_modalities = [],
    output_modalities = [],
    reasoning = false,
    tool_call = false,
    // Support both `pricing`/`limits` (old schema) and `cost`/`limit` (new schema)
    pricing: _pricing = {},
    limits: _limits = {},
    cost = {},
    limit = {},
  } = model;

  // Prefer pricing/limits but fall back to cost/limit (API v2 fields)
  const pricing = (
    Object.keys(_pricing).length > 0 ? _pricing : cost
  ) as Record<string, number>;
  const limits = (Object.keys(_limits).length > 0 ? _limits : limit) as Record<
    string,
    number
  >;

  return {
    id,
    name,
    litellm_provider: provider, // historically used field name
    knowledge,
    input_modalities,
    output_modalities,
    reasoning,
    tool_call,
    // pricing
    input_cost_per_token: pricing.input,
    output_cost_per_token: pricing.output,
    cache_read_cost_per_token: pricing.cache_read,
    cache_write_cost_per_token: pricing.cache_write,
    // limits
    max_input_tokens: limits.context,
    max_output_tokens: limits.output,
    // legacy booleans
    supports_function_calling: tool_call,
    supports_vision: input_modalities.includes("image"),
    mode: "chat", // default until the API gains explicit mode metadata
  };
}

export async function loadModelDb(): Promise<Record<string, any>> {
  const response = await fetch(MODELDB_URL).catch(() => null);
  if (!response?.ok) return {};

  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== "object") return {};

  const flattened: Record<string, any> = {};

  // API v2 shape: { providerId: { id, name, models: { modelId: {...} } } }
  for (const [providerId, providerInfo] of Object.entries(
    data as Record<string, any>
  )) {
    const modelsObj = (providerInfo as any).models ?? {};
    for (const model of Object.values(modelsObj)) {
      const normalized: RawModel = {
        ...(model as Record<string, any>),
        provider: providerId,
        pricing: (model as any).cost ?? (model as any).pricing ?? {},
        limits: (model as any).limit ?? (model as any).limits ?? {},
      } as RawModel;

      // Use a composite key to avoid collisions between providers that share the same model ID (e.g. "o3" for both OpenAI and Azure)
      const compositeKey = `${providerId}/${normalized.id}`;
      flattened[compositeKey] = flatten(normalized);
    }
  }

  return flattened;
}

export function getModelSeries(_modelName: string, _provider: string): string {
  return "other";
}
