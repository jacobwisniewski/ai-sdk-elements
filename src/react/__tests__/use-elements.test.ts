// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";
import type { UIMessage } from "ai";
import { useElements } from "../use-elements";
import { defineElementUI } from "../../core/define-element-ui";
import type { ElementPartData } from "../../core/types";
import { createElement } from "react";

const citeUI = defineElementUI({
  name: "cite",
  dataSchema: z.object({ title: z.string(), url: z.string() }),
  render: (data) => createElement("a", { href: data.url }, data.title),
  loading: () => createElement("span", null, "Loading citation..."),
  error: (msg) => createElement("span", { className: "error" }, msg),
});

const makeDataPart = (id: string, data: ElementPartData): UIMessage["parts"][number] => ({
  type: "data-element" as const,
  id,
  data,
});

describe("useElements", () => {
  describe("GIVEN plain text with no markers", () => {
    it("SHOULD return a single text segment", () => {
      const { result } = renderHook(() =>
        useElements({ text: "Hello world", parts: [], elements: [] }),
      );
      expect(result.current.segments).toMatchInlineSnapshot(`
        [
          {
            "content": "Hello world",
            "type": "text",
          },
        ]
      `);
    });

    it("SHOULD return empty segments for empty text", () => {
      const { result } = renderHook(() => useElements({ text: "", parts: [], elements: [] }));
      expect(result.current.segments).toMatchInlineSnapshot(`[]`);
    });
  });

  describe("GIVEN text with a marker and matching data part", () => {
    it("SHOULD split into text + element + text segments", () => {
      const text = 'See @cite{"url":"https://x.com"} for details';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      expect(result.current.segments).toHaveLength(3);
      expect(result.current.segments[0]).toMatchInlineSnapshot(`
        {
          "content": "See ",
          "type": "text",
        }
      `);
      expect(result.current.segments[1].type).toBe("element");
      expect(result.current.segments[1]).toMatchObject({
        type: "element",
        name: "cite",
        elementId: "el-0",
        state: "ready",
      });
      expect(result.current.segments[2]).toMatchInlineSnapshot(`
        {
          "content": " for details",
          "type": "text",
        }
      `);
    });
  });

  describe("GIVEN a marker in loading state", () => {
    it("SHOULD create an element segment with loading state", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      expect(result.current.segments).toHaveLength(1);
      const segment = result.current.segments[0];
      expect(segment).toMatchObject({
        type: "element",
        state: "loading",
      });
    });

    it("SHOULD render loading component", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      const segment = result.current.segments[0] as { render: () => unknown };
      const rendered = segment.render();
      expect(rendered).toMatchInlineSnapshot(`
        <span>
          Loading citation...
        </span>
      `);
    });
  });

  describe("GIVEN a marker in error state", () => {
    it("SHOULD render error component", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "error",
          error: "Not found",
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      const segment = result.current.segments[0] as { render: () => unknown };
      const rendered = segment.render();
      expect(rendered).toMatchInlineSnapshot(`
        <span
          className="error"
        >
          Not found
        </span>
      `);
    });
  });

  describe("GIVEN a marker with ready data", () => {
    it("SHOULD render the element component", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      const segment = result.current.segments[0] as { render: () => unknown };
      const rendered = segment.render();
      expect(rendered).toMatchInlineSnapshot(`
        <a
          href="https://x.com"
        >
          Example
        </a>
      `);
    });
  });

  describe("GIVEN a marker with no matching data part", () => {
    it("SHOULD default to loading state", () => {
      const text = '@cite{"url":"https://x.com"}';

      const { result } = renderHook(() => useElements({ text, parts: [], elements: [citeUI] }));

      expect(result.current.segments).toHaveLength(1);
      expect(result.current.segments[0]).toMatchObject({
        type: "element",
        state: "loading",
      });
    });
  });

  describe("GIVEN a marker with no matching UI definition", () => {
    it("SHOULD create segment that renders null", () => {
      const text = '@unknown{"x":1}';

      const { result } = renderHook(() => useElements({ text, parts: [], elements: [citeUI] }));

      expect(result.current.segments).toHaveLength(1);
      const segment = result.current.segments[0] as { render: () => unknown };
      expect(segment.render()).toBeNull();
    });
  });

  describe("GIVEN multiple markers", () => {
    it("SHOULD create segments for each with correct IDs", () => {
      const text = '@cite{"url":"a.com"} and @cite{"url":"b.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "a.com" },
          state: "ready",
          data: { title: "A", url: "a.com" },
        }),
        makeDataPart("el-1", {
          name: "cite",
          input: { url: "b.com" },
          state: "loading",
        }),
      ];

      const { result } = renderHook(() => useElements({ text, parts, elements: [citeUI] }));

      expect(result.current.segments).toHaveLength(3);
      expect(result.current.segments[0]).toMatchObject({
        type: "element",
        elementId: "el-0",
        state: "ready",
      });
      expect(result.current.segments[1]).toMatchObject({
        type: "text",
        content: " and ",
      });
      expect(result.current.segments[2]).toMatchObject({
        type: "element",
        elementId: "el-1",
        state: "loading",
      });
    });
  });
});
