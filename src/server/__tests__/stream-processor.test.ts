import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createStreamProcessor, type StreamProcessorDeps } from "../stream-processor";
import { defineElement } from "../../core/define-element";
import type {
  AnyElementDefinition,
  ElementUIMessageChunk,
  ElementPartData,
} from "../../core/types";

const citeElement = defineElement({
  name: "cite",
  description: "Citation",
  schema: z.object({ url: z.string() }),
  enrich: async (input) => ({ title: "Test Title", url: input.url }),
});

const failElement = defineElement({
  name: "fail",
  description: "Always fails",
  schema: z.object({ id: z.string() }),
  enrich: async () => {
    throw new Error("enrich failed");
  },
});

const createTestDeps = (
  elements: ReadonlyArray<AnyElementDefinition> = [citeElement],
  overrides: Partial<StreamProcessorDeps<undefined>> = {},
): { deps: StreamProcessorDeps<undefined>; chunks: Array<ElementUIMessageChunk> } => {
  const chunks: Array<ElementUIMessageChunk> = [];
  const deps: StreamProcessorDeps<undefined> = {
    elements,
    deps: undefined,
    write: (chunk) => chunks.push(chunk),
    ...overrides,
  };
  return { deps, chunks };
};

const isElementChunk = (
  chunk: ElementUIMessageChunk,
): chunk is { type: "data-element"; id: string; data: ElementPartData } =>
  chunk.type === "data-element";

describe("createStreamProcessor", () => {
  describe("GIVEN non-text-delta chunks", () => {
    it("SHOULD pass through non-text chunks unchanged", () => {
      const { deps, chunks } = createTestDeps();
      const processor = createStreamProcessor(deps);

      processor.process({ type: "start-step" });
      processor.process({ type: "finish-step" });

      expect(chunks).toMatchInlineSnapshot(`
        [
          {
            "type": "start-step",
          },
          {
            "type": "finish-step",
          },
        ]
      `);
    });
  });

  describe("GIVEN text-delta chunks with no markers", () => {
    it("SHOULD pass through text deltas without emitting element parts", () => {
      const { deps, chunks } = createTestDeps();
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: "Hello ", id: "t1" });
      processor.process({ type: "text-delta", delta: "world", id: "t1" });

      expect(chunks).toEqual([
        { type: "text-delta", delta: "Hello ", id: "t1" },
        { type: "text-delta", delta: "world", id: "t1" },
      ]);
    });
  });

  describe("GIVEN text-delta chunks that form a complete marker", () => {
    it("SHOULD emit a loading element part when marker is complete", () => {
      const { deps, chunks } = createTestDeps();
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: "Check this ", id: "t1" });
      processor.process({ type: "text-delta", delta: "@cite{", id: "t1" });
      processor.process({ type: "text-delta", delta: '"url":"https://x.com"', id: "t1" });
      processor.process({ type: "text-delta", delta: "} and more", id: "t1" });

      const elementParts = chunks.filter(isElementChunk);
      expect(elementParts).toHaveLength(1);
      expect(elementParts[0]).toMatchInlineSnapshot(`
        {
          "data": {
            "input": {
              "url": "https://x.com",
            },
            "name": "cite",
            "state": "loading",
          },
          "id": "el-0",
          "type": "data-element",
        }
      `);
    });
  });

  describe("GIVEN text-delta chunks forming multiple markers", () => {
    it("SHOULD emit loading parts with incrementing IDs", () => {
      const mapElement = defineElement({
        name: "map",
        description: "Map",
        schema: z.object({ lat: z.number(), lng: z.number() }),
        enrich: async (input) => input,
      });

      const { deps, chunks } = createTestDeps([citeElement, mapElement]);
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: '@cite{"url":"a.com"}', id: "t1" });
      processor.process({ type: "text-delta", delta: " then ", id: "t1" });
      processor.process({ type: "text-delta", delta: '@map{"lat":1,"lng":2}', id: "t1" });

      const elementParts = chunks.filter(isElementChunk);
      expect(elementParts).toHaveLength(2);
      expect(elementParts[0].id).toBe("el-0");
      expect(elementParts[1].id).toBe("el-1");
    });
  });

  describe("GIVEN enrichment resolves", () => {
    it("SHOULD emit a ready element part with enriched data", async () => {
      const { deps, chunks } = createTestDeps();
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: '@cite{"url":"https://x.com"}', id: "t1" });

      await vi.waitFor(() => {
        const readyParts = chunks.filter((c) => isElementChunk(c) && c.data.state === "ready");
        expect(readyParts).toHaveLength(1);
      });

      const readyPart = chunks.find((c) => isElementChunk(c) && c.data.state === "ready");
      expect(readyPart).toMatchInlineSnapshot(`
        {
          "data": {
            "data": {
              "title": "Test Title",
              "url": "https://x.com",
            },
            "input": {
              "url": "https://x.com",
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

  describe("GIVEN enrichment rejects", () => {
    it("SHOULD emit an error element part", async () => {
      const onEnrichError = vi.fn();
      const { deps, chunks } = createTestDeps([failElement], { onEnrichError });
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: '@fail{"id":"123"}', id: "t1" });

      await vi.waitFor(() => {
        const errorParts = chunks.filter((c) => isElementChunk(c) && c.data.state === "error");
        expect(errorParts).toHaveLength(1);
      });

      const errorPart = chunks.find((c) => isElementChunk(c) && c.data.state === "error");
      expect(errorPart).toMatchInlineSnapshot(`
        {
          "data": {
            "error": "enrich failed",
            "input": {
              "id": "123",
            },
            "name": "fail",
            "state": "error",
          },
          "id": "el-0",
          "type": "data-element",
        }
      `);
      expect(onEnrichError).toHaveBeenCalledOnce();
    });
  });

  describe("GIVEN the same marker is received across multiple chunks", () => {
    it("SHOULD not emit duplicate loading parts for already-processed markers", () => {
      const { deps, chunks } = createTestDeps();
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: '@cite{"url":"x.com"}', id: "t1" });
      processor.process({ type: "text-delta", delta: " more text after", id: "t1" });

      const loadingParts = chunks.filter((c) => isElementChunk(c) && c.data.state === "loading");
      expect(loadingParts).toHaveLength(1);
    });
  });

  describe("GIVEN flush is called after processing markers with slow enrichment", () => {
    it("SHOULD wait for all pending enrichments to complete before resolving", async () => {
      const slowElement = defineElement({
        name: "cite",
        description: "Slow citation",
        schema: z.object({ url: z.string() }),
        enrich: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { title: "Slow Result", url: input.url };
        },
      });

      const { deps, chunks } = createTestDeps([slowElement]);
      const processor = createStreamProcessor(deps);

      processor.process({ type: "text-delta", delta: '@cite{"url":"https://slow.com"}', id: "t1" });

      const readyBefore = chunks.filter((c) => isElementChunk(c) && c.data.state === "ready");
      expect(readyBefore).toHaveLength(0);

      await processor.flush();

      const readyAfter = chunks.filter((c) => isElementChunk(c) && c.data.state === "ready");
      expect(readyAfter).toHaveLength(1);
      expect(readyAfter[0]).toMatchInlineSnapshot(`
        {
          "data": {
            "data": {
              "title": "Slow Result",
              "url": "https://slow.com",
            },
            "input": {
              "url": "https://slow.com",
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
});
