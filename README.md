# ai-sdk-elements

Rich UI elements for the [Vercel AI SDK](https://sdk.vercel.ai/). Define, enrich, and render structured content inline with LLM text.

LLMs output `@name{...json...}` markers inline with text. The server parses these markers, enriches them with external data, and streams the results to the client. The client renders them as React components with loading, error, and ready states.

## Install

```bash
npm install ai-sdk-elements ai zod react
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

### 3. Generate the system prompt

```ts
import { generateElementPrompt } from "ai-sdk-elements";

const systemPrompt = generateElementPrompt([weatherElement]);
// Returns a markdown prompt instructing the LLM to emit @weather{"city":"..."} markers
```

### 4. Process the stream (server)

```ts
import { createElementStream } from "ai-sdk-elements/server";

// In your API route / server handler:
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

### 5. Render on the client (React)

#### Option A: `useElements` hook

Use this when you want full control over rendering. It returns an array of segments (text and element) that you can render however you like.

```tsx
import { useElements } from "ai-sdk-elements/react";

const MessageContent = ({ message }) => {
  const textPart = message.parts.find((p) => p.type === "text");
  const { segments } = useElements({
    text: textPart?.text ?? "",
    parts: message.parts,
    elements: [weatherElementUI],
  });

  return (
    <div>
      {segments.map((segment, i) =>
        segment.type === "text" ? (
          <span key={i}>{segment.content}</span>
        ) : (
          <div key={segment.elementId}>{segment.render()}</div>
        ),
      )}
    </div>
  );
};
```

Each `ElementSegment` has:

- `name` — the element name
- `elementId` — stable ID matching the server-emitted data part (e.g. `"el-0"`)
- `state` — `"loading"` | `"ready"` | `"error"`
- `render()` — calls the appropriate `render`, `loading`, or `error` function from the UI definition

#### Option B: `useMarkdownElements` hook

Use this with markdown renderers like `react-markdown` + `rehype-raw`. Markers are replaced with HTML tags that map to React components.

```tsx
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useMarkdownElements } from "ai-sdk-elements/react/markdown";

const MarkdownMessage = ({ message }) => {
  const textPart = message.parts.find((p) => p.type === "text");
  const { processedText, components } = useMarkdownElements({
    text: textPart?.text ?? "",
    parts: message.parts,
    elements: [weatherElementUI],
  });

  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
      {processedText}
    </ReactMarkdown>
  );
};
```

`useMarkdownElements` returns:

- `processedText` — markdown with markers replaced by `<name data-element-id="el-0"></name>` HTML tags
- `components` — a record mapping element names to React components (pass directly to your markdown renderer)
- `elementNames` — deduplicated list of element names found in the text

## How It Works

```
LLM generates text with markers
  "The weather in Melbourne is: \n@weather{"city":"Melbourne"}\n Great city!"
        │
        ▼
Server (createElementStream)
  1. Passes through all chunks to the client
  2. Detects @weather{"city":"Melbourne"} in text-delta chunks
  3. Validates input against the element's Zod schema
  4. Emits a data-element part: { id: "el-0", state: "loading" }
  5. Calls enrich() asynchronously
  6. Emits a data-element part: { id: "el-0", state: "ready", data: { ... } }
        │
        ▼
Client (useElements / useMarkdownElements)
  1. Parses markers from the text
  2. Matches data-element parts by ID
  3. Renders loading/ready/error states via the UI definition
```

## API Reference

### Core (`ai-sdk-elements`)

#### `defineElement(definition)`

Identity function for type inference. Defines a server-side element with:

| Property      | Type                                                | Description                                   |
| ------------- | --------------------------------------------------- | --------------------------------------------- |
| `name`        | `string`                                            | Marker name the LLM emits                     |
| `description` | `string`                                            | Description for the LLM prompt                |
| `schema`      | `ZodType`                                           | Zod schema for the marker's JSON input        |
| `example?`    | `z.infer<schema>`                                   | Optional example input for the prompt         |
| `enrich`      | `(input, deps) => Promise<Record<string, unknown>>` | Async function to fetch/compute the full data |

#### `defineElementUI(definition)`

Identity function for type inference. Defines a client-side element UI with:

| Property     | Type                           | Description                             |
| ------------ | ------------------------------ | --------------------------------------- |
| `name`       | `string`                       | Must match the server-side element name |
| `dataSchema` | `ZodType`                      | Zod schema for the enriched data        |
| `render`     | `(data) => ReactNode`          | Renders the element when data is ready  |
| `loading?`   | `() => ReactNode`              | Renders while enrichment is in progress |
| `error?`     | `(error: string) => ReactNode` | Renders when enrichment fails           |

#### `generateElementPrompt(elements)`

Generates a markdown system prompt instructing the LLM how to emit markers. Auto-generates examples from Zod schemas if `example` is not provided.

#### `findMarkers(text)`

Returns all `@name{...}` marker positions in the text. Handles nested braces.

#### `parseMarkers(text, elements)`

Finds and validates all markers against element schemas. Returns only successfully parsed markers.

#### `hasPartialMarker(text)`

Returns `true` if the text ends with an incomplete marker (useful for streaming).

### Server (`ai-sdk-elements/server`)

#### `createElementStream(options)`

Wraps an AI SDK stream and enriches markers. Returns a new `ReadableStream<UIMessageChunk>`.

| Option           | Type                             | Description                                   |
| ---------------- | -------------------------------- | --------------------------------------------- |
| `source`         | `ReadableStream<UIMessageChunk>` | The AI SDK source stream                      |
| `elements`       | `ElementDefinition[]`            | Server-side element definitions               |
| `deps`           | `TDeps`                          | Dependencies injected into `enrich` functions |
| `onEnrichError?` | `(error, marker) => void`        | Error callback for enrichment failures        |

#### `createStreamProcessor(deps)`

Lower-level API. Returns a stateful callback `(chunk) => void` that processes chunks and calls `write()` with enriched data parts. Used internally by `createElementStream`.

### React (`ai-sdk-elements/react`)

#### `useElements(options)`

React hook that parses markers from text and matches them with data parts.

Returns `{ segments }` where each segment is either:

- `TextSegment`: `{ type: "text", content: string }`
- `ElementSegment`: `{ type: "element", name, elementId, state, render() }`

### React Markdown (`ai-sdk-elements/react/markdown`)

#### `useMarkdownElements(options)`

React hook for markdown renderers. Replaces markers with HTML tags and provides matching React components.

Returns `{ processedText, components, elementNames }`.

## Types

The package is strongly typed to AI SDK v5. Key types:

```ts
// Extends AI SDK's UIDataTypes with a custom "element" data part
interface ElementDataTypes extends UIDataTypes {
  element: ElementPartData;
}

// Typed AI SDK message and chunk types
type ElementUIMessage = UIMessage<unknown, ElementDataTypes>;
type ElementUIMessageChunk = UIMessageChunk<unknown, ElementDataTypes>;

// Element data part states (discriminated union)
type ElementPartData = ElementPartLoading | ElementPartReady | ElementPartError;
```

## License

MIT
