import { createStreamProcessor } from "./stream-processor";
import type { AnyElementDefinition, ElementUIMessageChunk, ParsedMarker } from "../core/types";

interface CreateElementStreamOptions<TDeps> {
  source: ReadableStream<ElementUIMessageChunk>;
  elements: ReadonlyArray<AnyElementDefinition>;
  deps: TDeps;
  onEnrichError?: (error: unknown, marker: ParsedMarker) => void;
}

export const createElementStream = <TDeps>(
  options: CreateElementStreamOptions<TDeps>,
): ReadableStream<ElementUIMessageChunk> => {
  const { source, elements, deps, onEnrichError } = options;

  return new ReadableStream<ElementUIMessageChunk>({
    start(controller) {
      const processor = createStreamProcessor({
        elements,
        deps,
        write: (chunk) => controller.enqueue(chunk),
        onEnrichError,
      });

      const reader = source.getReader();

      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          await processor.flush();
          controller.close();
          return;
        }
        processor.process(value);
        return pump();
      };

      pump().catch((error) => {
        controller.error(error);
      });
    },
  });
};
