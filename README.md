# aidex

![llmdex Cover](/public/cover.jpeg)

A CLI tool that provides detailed information about AI language models, helping developers choose the right model for their needs.

## Usage

Usage: aidex [options] [search terms]

Options:
  --help                  Show this help message
  -h                     Alias for --help
  -m, --model <name>     Search for specific model(s)
  --provider <name>      Filter by provider
  --function-calling     Show only models that support function calling
  --vision              Show only models that support vision
  --assistant-prefill   Show only models that support assistant prefill
  --mode <type>         Filter by mode (embedding, chat, completion, rerank, etc)
  --sort-token          Sort by max input tokens (descending)
  --sort-cost           Sort by input cost per token (descending)
  --sort-by <field>     Sort by specific field (max_tokens, max_input_tokens, etc)
  -c, --compare <models> Compare multiple models (comma-separated)
  --verbose [level]     Show debug output (default level: 1, max: 2)

Examples:
  npx aidex --model gemini
  npx aidex --provider openai
  npx aidex --function-calling --vision
  npx aidex --mode chat --sort-cost
  npx aidex --compare "gpt-4,claude-2"

## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)
- Ultimate Cursor AI Course: [Instructa.ai](https://www.instructa.ai/en/cursor-ai)
