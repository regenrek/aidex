# aidex

![llmdex Cover](/public/cover.png)

A CLI tool that provides detailed information about AI language models, helping developers choose the right model for their needs.

>Note: This project is now using the [models.dev](https://github.com/sst/models.dev) Database. Thanks for making it!

## Usage

List models by popular providers
```
npx aidex --provider openai
npx aidex --provider anthropic
npx aidex --provider google
```

List all multimodal models that *accept images* as input:
```bash
npx aidex --input image --provider openai
```

Compare popular reasoning‑capable chat models:

```bash
npx aidex --compare "o3,opus4"
```

Find all models under **\$1 per million cache reads** grouped by provider (note the additional `--model` filter which is required when using `--group-by`):

```bash
npx aidex --model gpt --group-by provider --sort-by cache_read_cost_per_token
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
| `--sort-token`                                                   | Sort by maximum input tokens (descending).                                                       |
| `--sort-cost`                                                    | Sort by input cost per token (descending).                                                       |
| `--group-by <criteria>`                                          | `type`, `provider`, `mode`, `series` *(requires `--model` or `--provider` flag)*.               |
| *All previous flags (`--model`, `--provider`, etc.) still work.* |                                                                                                  |

# ✨ **Emoji legend**: `📷` image, `🔊` audio, `🎥` video, `📝` text.

## Grouping Models

The `--group-by` option helps organise results into logical sections. **It must be combined with either `--model` or `--provider`** so that the search space is first narrowed before grouping.

Available grouping keys:

- `provider` – AI providers (OpenAI, Anthropic, etc.)
- `type` – Model capability buckets (Latest, Vision, etc.)
- `mode` – Model mode (Chat, Embedding, Rerank, …)
- `series` – Major model series (legacy vs latest, etc.)

Examples:

```bash
# Group every GPT-style model by provider and sort by cache-read cost
npx aidex --model gpt --group-by provider --sort-by cache_read_cost_per_token

# Show all OpenAI models grouped by type
npx aidex --provider openai --group-by type

# Combine convenience sort flags
npx aidex --mode chat --sort-cost --group-by mode
```

## Links

- X/Twitter: [@kregenrek](https://x.com/kregenrek)
- Bluesky: [@kevinkern.dev](https://bsky.app/profile/kevinkern.dev)

## Courses
- Learn Cursor AI: [Ultimate Cursor Course](https://www.instructa.ai/en/cursor-ai)
- Learn to build software with AI: [AI Builder Hub](https://www.instructa.ai)

## See my other projects:

* [codefetch](https://github.com/regenrek/codefetch) - Turn code into Markdown for LLMs with one simple terminal command
* [instructa](https://github.com/orgs/instructa/repositories) - Instructa Projects

## Credits

[unjs](https://github.com/unjs) - for bringing us the best javascript tooling system