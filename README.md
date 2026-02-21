# ai-sdk-elements

[![npm version](https://img.shields.io/npm/v/ai-sdk-elements)](https://www.npmjs.com/package/ai-sdk-elements)

Rich UI elements for the [Vercel AI SDK](https://sdk.vercel.ai/). Define, enrich, and render structured content inline with LLM text.

LLMs output `@name{...json...}` markers inline with text. The server parses these markers, enriches them with external data, and streams the results to the client. The client renders them as React components with loading, error, and ready states.

## Install

```bash
npm install ai-sdk-elements ai zod react streamdown
```

`ai` (v5+), `zod`, and `react` are peer dependencies.

## Quick Start

### 1. Define an element (server)

```ts
import { defineElement } from "ai-sdk-elements";
import { z } from "zod";

const weatherElement = defineElement({
  name: "weather",
  description: "Display current weather for a city",
  schema: z.object({
    city: z.string().describe("City name"),
  }),
  enrich: async (input, deps) => {
    const response = await fetch(`https://api.weather.example/v1/current?city=${input.city}`);
    const data = await response.json();
    return { city: input.city, temperature: data.temperature, condition: data.condition };
  },
});
```

### 2. Define the element UI (client)

```tsx
import { defineElementUI } from "ai-sdk-elements";
import { z } from "zod";

const weatherElementUI = defineElementUI({
  name: "weather",
  dataSchema: z.object({
    city: z.string(),
    temperature: z.number(),
    condition: z.string(),
  }),
  render: (data) => (
    <div className="weather-card">
      <h3>{data.city}</h3>
      <p>
        {data.temperature}° — {data.condition}
      </p>
    </div>
  ),
  loading: () => <div className="skeleton">Loading weather...</div>,
  error: (error) => <div className="error">Failed to load weather: {error}</div>,
});
```

### 3. Generate the system prompt and stream

Use `generateElementPrompt` to build the instruction block, then pass it as part of the system prompt to `streamText` or a `ToolLoopAgent`.

#### With `streamText`

```ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateElementPrompt } from "ai-sdk-elements";
import { createElementStream } from "ai-sdk-elements/server";

const elementPrompt = generateElementPrompt([weatherElement]);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4.1"),
    system: `You are a helpful assistant.\n\n${elementPrompt}`,
    messages,
  });

  const enrichedStream = createElementStream({
    source: result.toUIMessageStream(),
    elements: [weatherElement],
  });

  return new Response(enrichedStream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

#### With `ToolLoopAgent`

```ts
import { ToolLoopAgent, createAgentUIStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateElementPrompt } from "ai-sdk-elements";

const elementPrompt = generateElementPrompt([weatherElement]);

const agent = new ToolLoopAgent({
  model: openai("gpt-4.1"),
  instructions: `You are a helpful assistant.\n\n${elementPrompt}`,
  tools: {
    /* your tools here */
  },
});
```

### 4. Process the stream (server)

```ts
import { createElementStream } from "ai-sdk-elements/server";

const enrichedStream = createElementStream({
  source: aiSdkStream, // ReadableStream<UIMessageChunk> from the AI SDK
  elements: [weatherElement],
  deps: {}, // Dependency injection (API clients, DB connections, etc.)
  onEnrichError: (error, marker) => {
    console.error(`Failed to enrich ${marker.name}:`, error);
  },
});
```

`createElementStream` wraps the AI SDK stream. It passes through all chunks, detects `@name{...}` markers in text deltas, and emits `data-element` parts with progressive state updates (`loading` -> `ready` or `error`).

### 5. Render with Streamdown (client)

Use `useMarkdownElements` with [Streamdown](https://github.com/vercel/streamdown) to render elements inline with markdown. Markers are replaced with HTML tags that map to React components.

```tsx
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { useMarkdownElements } from "ai-sdk-elements/react/streamdown";

const MarkdownMessage = ({ message }) => {
  const textPart = message.parts.find((p) => p.type === "text");
  const { processedText, components, elementNames } = useMarkdownElements({
    text: textPart?.text ?? "",
    parts: message.parts,
    elements: [weatherElementUI],
  });

  return (
    <Streamdown
      allowedTags={Object.fromEntries(elementNames.map((name) => [name, ["data-element-id"]]))}
      components={components}
    >
      {processedText}
    </Streamdown>
  );
};
```

`useMarkdownElements` returns:

- `processedText` — markdown with markers replaced by `<name data-element-id="el-0"></name>` HTML tags
- `components` — a record mapping element names to React components (pass directly to Streamdown)
- `elementNames` — deduplicated list of element names found in the text (use with `allowedTags` to whitelist them through Streamdown's sanitizer)

## License

MIT
