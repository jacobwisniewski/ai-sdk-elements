import type { AnyElementDefinition, ElementUIMessageChunk, ParsedMarker } from "../core/types";

export interface ElementStreamOptions<TDeps = unknown> {
  source: ReadableStream<ElementUIMessageChunk>;
  elements: ReadonlyArray<AnyElementDefinition>;
  deps: TDeps;
  onEnrichError?: (error: unknown, marker: ParsedMarker) => void;
}
