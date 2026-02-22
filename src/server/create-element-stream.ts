import { createStreamProcessor } from "./stream-processor";
import type { ElementUIMessageChunk } from "../core/types";
import type { ElementStreamOptions } from "./types";
import type { StreamProcessor } from "./stream-processor";
import { isAbortException } from "./is-abort-exception";

export const createElementStream = <TDeps>(
  options: ElementStreamOptions<TDeps>,
): ReadableStream<ElementUIMessageChunk> => {
  const { source, elements, deps, abortSignal, onEnrichError } = options;
  const abortController = new AbortController();
  const signal = abortController.signal;
  const processorRef: { current: StreamProcessor | null } = { current: null };

  const abortFromParentSignal = (): void => {
    abortController.abort(new DOMException("Aborted", "AbortError"));
  };

  abortSignal?.addEventListener("abort", abortFromParentSignal, { once: true });

  const transformed = new TransformStream<ElementUIMessageChunk, ElementUIMessageChunk>({
    transform: (chunk, controller): void => {
      const processor =
        processorRef.current ??
        createStreamProcessor({
          elements,
          deps,
          abortSignal: signal,
          write: (part) => {
            if (signal.aborted) return;
            controller.enqueue(part);
          },
          onEnrichError,
        });

      processorRef.current = processor;
      processor.process(chunk);
    },
    flush: async (): Promise<void> => {
      await processorRef.current?.flush(signal.aborted);
    },
  });

  void source
    .pipeTo(transformed.writable, { signal })
    .catch((error) => {
      if (signal.aborted || isAbortException(error)) return;
    })
    .finally(() => {
      abortController.abort();
      abortSignal?.removeEventListener("abort", abortFromParentSignal);
    });

  return transformed.readable;
};
