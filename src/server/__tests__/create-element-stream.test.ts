import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createElementStream } from "../create-element-stream";
import { defineElement } from "../../core/define-element";
import type { ElementUIMessageChunk, ElementPartData } from "../../core/types";

const collectStream = async (
  stream: ReadableStream<ElementUIMessageChunk>,
): Promise<ReadonlyArray<ElementUIMessageChunk>> => {
  const chunks: Array<ElementUIMessageChunk> = [];
  const reader = stream.getReader();
  const pump = async (): Promise<void> => {
    const { done, value } = await reader.read();
    if (done) return;
    chunks.push(value);
    return pump();
  };
  await pump();
  return chunks;
};

const isElementChunk = (
  chunk: ElementUIMessageChunk,
): chunk is { type: "data-element"; id: string; data: ElementPartData } =>
  chunk.type === "data-element";

describe("createElementStream", () => {
  describe("GIVEN a source stream that ends before enrichment resolves", () => {
    it("SHOULD wait for enrichment to complete before closing the output stream", async () => {
      const slowElement = defineElement({
        name: "cite",
        description: "Slow citation",
        schema: z.object({ url: z.string() }),
        enrich: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { title: "Enriched", url: input.url };
        },
      });

      const source = new ReadableStream<ElementUIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: "text-delta", delta: '@cite{"url":"https://example.com"}', id: "t1" });
          controller.close();
        },
      });

      const output = createElementStream({
        source,
        elements: [slowElement],
        deps: undefined,
      });

      const chunks = await collectStream(output);

      const readyParts = chunks.filter((c) => isElementChunk(c) && c.data.state === "ready");
      expect(readyParts).toHaveLength(1);
      expect(readyParts[0]).toMatchInlineSnapshot(`
        {
          "data": {
            "data": {
              "title": "Enriched",
              "url": "https://example.com",
            },
            "input": {
              "url": "https://example.com",
            },
            "name": "cite",
            "state": "ready",
          },
          "id": "el-0",
          "type": "data-element",
        }
      `);
    });
  });

  describe("GIVEN multiple markers with slow enrichment", () => {
    it("SHOULD wait for all enrichments before closing", async () => {
      const slowElement = defineElement({
        name: "cite",
        description: "Slow citation",
        schema: z.object({ url: z.string() }),
        enrich: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { title: `Title for ${input.url}`, url: input.url };
        },
      });

      const source = new ReadableStream<ElementUIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: "text-delta", delta: '@cite{"url":"a.com"} then @cite{"url":"b.com"}', id: "t1" });
          controller.close();
        },
      });

      const output = createElementStream({
        source,
        elements: [slowElement],
        deps: undefined,
      });

      const chunks = await collectStream(output);

      const readyParts = chunks.filter((c) => isElementChunk(c) && c.data.state === "ready");
      expect(readyParts).toHaveLength(2);
    });
  });
});
