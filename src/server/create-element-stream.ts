import { createStreamProcessor } from "./stream-processor";
import type { ElementUIMessageChunk } from "../core/types";
import type { ElementStreamOptions } from "./types";

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (error instanceof Error) return error.name === "AbortError";
  return false;
};

export const createElementStream = <TDeps>(
  options: ElementStreamOptions<TDeps>,
): ReadableStream<ElementUIMessageChunk> => {
  const { source, elements, deps, abortSignal, onEnrichError } = options;
  let reader: ReadableStreamDefaultReader<ElementUIMessageChunk> | null = null;
  let localAbortController: AbortController | null = null;
  let activeReader: ReadableStreamDefaultReader<ElementUIMessageChunk> | null = null;

  return new ReadableStream<ElementUIMessageChunk>({
    start(controller) {
      const abortController = new AbortController();
      localAbortController = abortController;
      const signal = abortController.signal;

      const abortFromParentSignal = (): void => {
        abortController.abort(abortSignal?.reason);
        void activeReader?.cancel(abortSignal?.reason).catch(() => undefined);
      };

      abortSignal?.addEventListener("abort", abortFromParentSignal, { once: true });

      const processor = createStreamProcessor({
        elements,
        deps,
        abortSignal: signal,
        write: (chunk) => controller.enqueue(chunk),
        onEnrichError,
      });

      const streamReader = source.getReader();
      reader = streamReader;
      activeReader = streamReader;

      const pump = async (): Promise<void> => {
        if (signal.aborted) {
          await reader?.cancel(signal.reason).catch(() => undefined);
          controller.close();
          return;
        }

        const { done, value } = await streamReader.read();
        if (done) {
          await processor.flush(signal.aborted);
          controller.close();
          return;
        }

        processor.process(value);
        return pump();
      };

      pump()
        .catch((error) => {
          if (signal.aborted || isAbortError(error)) {
            return;
          }

          controller.error(error);
        })
        .finally(() => {
          activeReader = null;
          abortSignal?.removeEventListener("abort", abortFromParentSignal);
        });
    },
    cancel(reason) {
      localAbortController?.abort(reason);
      return reader?.cancel(reason) ?? Promise.resolve();
    },
  });
};
