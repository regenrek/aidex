export type TokenEncoder = "simple" | "p50k" | "o200k" | "cl100k";

export interface ModelDBEntry {
  max_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
  supports_system_messages?: boolean;
  litellm_provider?: string;
  mode?: string;
  [key: string]: number | string | boolean | undefined;
}
