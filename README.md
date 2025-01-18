# aidex

![llmdex Cover](/public/cover.png)

A CLI tool that provides detailed information about AI language models, helping developers choose the right model for their needs.

## Usage

List all GPT models and group by series
```
npx aidex -m gpt -g
```

List all OpenAI models and group by type
```
npx aidex -p openai --group-by type
```

Compare models
```
npx aidex --compare gemini,gpt-4o,claude-3-5-sonnet
```


## Usage


```
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
  --group-by <criteria> Group results by: type, provider, mode, or series (requires --model or --provider)
  --show-all           Show all versions of models (including older ones)
  -c, --compare <models>  Compare multiple models (comma-separated)
  --verbose [level]    Show debug output (default level: 1, max: 2)
```

## Grouping Models

The `--group-by` option allows you to organize models in different ways:

- `provider`: Groups by AI providers (OpenAI, Anthropic, etc.)
- `type`: Groups by model capabilities (Latest, Vision, etc.)
- `mode`: Groups by model mode (Chat, Embedding, etc.)
- `series`: Groups by model series:
  - OpenAI: GPT-4, GPT-4-mini, O1, Embedding, Audio, etc.
  - Anthropic: Sonnet, Haiku, Opus (use --show-all to see legacy models)

Examples:
  npx aidex --model gemini
  npx aidex --provider openai
  npx aidex --function-calling --vision
  npx aidex --mode chat --sort-cost
  npx aidex --compare "gpt-4,claude-2"
  npx aidex --group-by series
  npx aidex --show-all --group-by type

## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)
- Ultimate Cursor AI Course: [Instructa.ai](https://www.instructa.ai/en/cursor-ai)
