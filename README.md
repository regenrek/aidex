# aidex

![llmdex Cover](/public/cover.png)

A CLI tool that provides detailed information about AI language models, helping developers choose the right model for their needs.

## Usage (updated for models.dev schema)

List all multimodal models that *accept images* as input:
```bash
npx aidex --input image
````

Compare popular reasoning‑capable chat models:

```bash
npx aidex --reasoning --compare "gpt-4o,claude-3-5-sonnet,gemini-1.5-pro"
```

Find all models under **\$1 per million cache reads** grouped by provider:

```bash
npx aidex --group-by provider --sort-by cache_read_cost_per_token
```

### Options (excerpt)

| Flag                                                             | Description                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `--input <mod>`                                                  | Require an input modality (`text`, `image`, `audio`, `video`). Repeat flag for multiple.         |
| `--output <mod>`                                                 | Filter by output modality.                                                                       |
| `--reasoning`                                                    | Show only models flagged as reasoning‑capable.                                                   |
| `--tool-call`                                                    | Show only models that support function / tool calling.                                           |
| `--vision`                                                       | Alias for `--input image` (kept for backwards compatibility).                                    |
| `--sort-by <field>`                                              | Any numeric field, e.g. `input_cost_per_token`, `cache_read_cost_per_token`, `max_input_tokens`. |
| `--group-by <criteria>`                                          | `type`, `provider`, `mode` (series removed).                                                     |
| *All previous flags (`--model`, `--provider`, etc.) still work.* |                                                                                                  |

# ✨ **Emoji legend**: `📷` image, `🔊` audio, `🎥` video, `📝` text.

## Grouping Models

The `--group-by` option allows you to organize models in different ways:

- `provider`: Groups by AI providers (OpenAI, Anthropic, etc.)
- `type`: Groups by model capabilities (Latest, Vision, etc.)
- `mode`: Groups by model mode (Chat, Embedding, etc.)

Examples:
  npx aidex --model gemini
  npx aidex --provider openai
  npx aidex --function-calling --vision
  npx aidex --mode chat --sort-cost
  npx aidex --compare "gpt-4,claude-2"
  npx aidex --group-by provider
  npx aidex --show-all --group-by type

## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)

## Courses
- Learn Cursor AI: [Ultimate Cursor Course](https://www.instructa.ai/en/cursor-ai)
- Learn to build software with AI: [AI Builder Hub](https://www.instructa.ai/en/ai-builder-hub)

## See my other projects:

* [codefetch](https://github.com/regenrek/codefetch) - Turn code into Markdown for LLMs with one simple terminal command
* [aidex](https://github.com/regenrek/aidex) A CLI tool that provides detailed information about AI language models, helping developers choose the right model for their needs.
* [codetie](https://github.com/codetie-ai/codetie) - XCode CLI

## Credits

[unjs](https://github.com/unjs) - for bringing us the best javascript tooling system