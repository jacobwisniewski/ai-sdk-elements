import type { AnyElementDefinition, ElementUIMessageChunk, ParsedMarker } from "../core/types";

export interface ElementStreamOptions {
  source: ReadableStream<ElementUIMessageChunk>;
  elements: ReadonlyArray<AnyElementDefinition>;
  abortSignal?: AbortSignal;
  onEnrichError?: (error: unknown, marker: ParsedMarker) => void;
}
