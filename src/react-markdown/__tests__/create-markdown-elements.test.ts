// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";
import type { UIMessage } from "ai";
import { useMarkdownElements } from "../create-markdown-elements";
import { defineElementUI } from "../../core/define-element-ui";
import { createElement } from "react";
import type { ElementPartData } from "../../core/types";

const citeUI = defineElementUI({
  name: "cite",
  dataSchema: z.object({ title: z.string(), url: z.string() }),
  render: (data) => createElement("a", { href: data.url }, data.title),
  loading: () => createElement("span", null, "Loading..."),
  error: (msg) => createElement("span", { className: "error" }, msg),
});

const mapUI = defineElementUI({
  name: "map",
  dataSchema: z.object({ lat: z.number(), lng: z.number() }),
  render: (data) => createElement("div", null, `${data.lat},${data.lng}`),
});

const makeDataPart = (id: string, data: ElementPartData): UIMessage["parts"][number] => ({
  type: "data-element" as const,
  id,
  data,
});

describe("useMarkdownElements", () => {
  describe("GIVEN text with no markers", () => {
    it("SHOULD return original text with empty components", () => {
      const { result } = renderHook(() =>
        useMarkdownElements({ text: "Hello world", parts: [], elements: [] }),
      );

      expect(result.current.processedText).toBe("Hello world");
      expect(result.current.components).toEqual({});
      expect(result.current.elementNames).toEqual([]);
    });
  });

  describe("GIVEN text with a single marker", () => {
    it("SHOULD replace marker with HTML tag", () => {
      const text = 'See @cite{"url":"https://x.com"} for details';
      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts: [], elements: [citeUI] }),
      );

      expect(result.current.processedText).toBe(
        'See <cite data-element-id="el-0" data-element-state="loading"></cite> for details',
      );
    });

    it("SHOULD include element name in elementNames", () => {
      const text = '@cite{"url":"x.com"}';
      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts: [], elements: [citeUI] }),
      );

      expect(result.current.elementNames).toEqual(["cite"]);
    });

    it("SHOULD create component that renders loading state", () => {
      const text = '@cite{"url":"https://x.com"}';
      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts: [], elements: [citeUI] }),
      );

      const CiteComponent = result.current.components.cite;
      expect(CiteComponent).toBeDefined();

      const rendered = CiteComponent({ "data-element-id": "el-0" });
      expect(rendered).toMatchInlineSnapshot(`
        <span>
          Loading...
        </span>
      `);
    });

    it("SHOULD create component that renders ready state", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      const { result } = renderHook(() => useMarkdownElements({ text, parts, elements: [citeUI] }));

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="ready"></cite>',
      );

      const CiteComponent = result.current.components.cite;
      const rendered = CiteComponent({ "data-element-id": "el-0" });
      expect(rendered).toMatchInlineSnapshot(`
        <a
          href="https://x.com"
        >
          Example
        </a>
      `);
    });

    it("SHOULD create component that renders error state", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "error",
          error: "Not found",
        }),
      ];

      const { result } = renderHook(() => useMarkdownElements({ text, parts, elements: [citeUI] }));

      const CiteComponent = result.current.components.cite;
      const rendered = CiteComponent({ "data-element-id": "el-0" });
      expect(rendered).toMatchInlineSnapshot(`
        <span
          className="error"
        >
          Not found
        </span>
      `);
    });
  });

  describe("GIVEN text with multiple markers", () => {
    it("SHOULD replace all markers with HTML tags", () => {
      const text = '@cite{"url":"a.com"} then @map{"lat":1,"lng":2}';
      const { result } = renderHook(() =>
        useMarkdownElements({
          text,
          parts: [],
          elements: [citeUI, mapUI],
        }),
      );

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="loading"></cite> then <map data-element-id="el-1" data-element-state="loading"></map>',
      );
    });

    it("SHOULD deduplicate element names", () => {
      const text = '@cite{"url":"a.com"} @cite{"url":"b.com"}';
      const { result } = renderHook(() =>
        useMarkdownElements({
          text,
          parts: [],
          elements: [citeUI],
        }),
      );

      expect(result.current.elementNames).toEqual(["cite"]);
    });

    it("SHOULD create components for each element type", () => {
      const text = '@cite{"url":"a.com"} @map{"lat":1,"lng":2}';
      const { result } = renderHook(() =>
        useMarkdownElements({
          text,
          parts: [],
          elements: [citeUI, mapUI],
        }),
      );

      expect(result.current.components.cite).toBeDefined();
      expect(result.current.components.map).toBeDefined();
    });
  });

  describe("GIVEN component called without data-element-id", () => {
    it("SHOULD return null", () => {
      const text = '@cite{"url":"a.com"}';
      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts: [], elements: [citeUI] }),
      );

      const CiteComponent = result.current.components.cite;
      const rendered = CiteComponent({});
      expect(rendered).toBeNull();
    });
  });

  describe("GIVEN element state transitions", () => {
    it("SHOULD change processedText when part transitions from loading to ready", () => {
      const text = '@cite{"url":"https://x.com"}';
      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownElements({ text, parts, elements: [citeUI] }),
        { initialProps: { parts: loadingParts } },
      );

      expect(result.current.processedText).toContain('data-element-state="loading"');

      const readyParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      rerender({ parts: readyParts });

      expect(result.current.processedText).toContain('data-element-state="ready"');
    });

    it("SHOULD switch component render output from loading to ready", () => {
      const text = '@cite{"url":"https://x.com"}';
      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownElements({ text, parts, elements: [citeUI] }),
        { initialProps: { parts: loadingParts } },
      );

      const loadingRendered = result.current.components.cite({ "data-element-id": "el-0" });
      expect(loadingRendered).toMatchInlineSnapshot(`
        <span>
          Loading...
        </span>
      `);

      const readyParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      rerender({ parts: readyParts });

      const readyRendered = result.current.components.cite({ "data-element-id": "el-0" });
      expect(readyRendered).toMatchInlineSnapshot(`
        <a
          href="https://x.com"
        >
          Example
        </a>
      `);
    });

    it("SHOULD change processedText when part transitions from loading to error", () => {
      const text = '@cite{"url":"https://x.com"}';
      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownElements({ text, parts, elements: [citeUI] }),
        { initialProps: { parts: loadingParts } },
      );

      expect(result.current.processedText).toContain('data-element-state="loading"');

      const errorParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "error",
          error: "Not found",
        }),
      ];

      rerender({ parts: errorParts });

      expect(result.current.processedText).toContain('data-element-state="error"');
      const rendered = result.current.components.cite({ "data-element-id": "el-0" });
      expect(rendered).toMatchInlineSnapshot(`
        <span
          className="error"
        >
          Not found
        </span>
      `);
    });

    it("SHOULD transition multiple elements independently", () => {
      const text = '@cite{"url":"a.com"} then @cite{"url":"b.com"}';
      const bothLoadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "a.com" },
          state: "loading",
        }),
        makeDataPart("el-1", {
          name: "cite",
          input: { url: "b.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownElements({ text, parts, elements: [citeUI] }),
        { initialProps: { parts: bothLoadingParts } },
      );

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="loading"></cite> then <cite data-element-id="el-1" data-element-state="loading"></cite>',
      );

      const firstReadyParts: UIMessage["parts"] = [
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

      rerender({ parts: firstReadyParts });

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="ready"></cite> then <cite data-element-id="el-1" data-element-state="loading"></cite>',
      );

      const bothReadyParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "a.com" },
          state: "ready",
          data: { title: "A", url: "a.com" },
        }),
        makeDataPart("el-1", {
          name: "cite",
          input: { url: "b.com" },
          state: "ready",
          data: { title: "B", url: "b.com" },
        }),
      ];

      rerender({ parts: bothReadyParts });

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="ready"></cite> then <cite data-element-id="el-1" data-element-state="ready"></cite>',
      );
    });

    it("SHOULD handle no parts transitioning to loading then ready", () => {
      const text = '@cite{"url":"https://x.com"}';

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownElements({ text, parts, elements: [citeUI] }),
        { initialProps: { parts: [] as UIMessage["parts"] } },
      );

      expect(result.current.processedText).toContain('data-element-state="loading"');

      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      rerender({ parts: loadingParts });

      expect(result.current.processedText).toContain('data-element-state="loading"');

      const readyParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      rerender({ parts: readyParts });

      expect(result.current.processedText).toContain('data-element-state="ready"');
      const rendered = result.current.components.cite({ "data-element-id": "el-0" });
      expect(rendered).toMatchInlineSnapshot(`
        <a
          href="https://x.com"
        >
          Example
        </a>
      `);
    });
  });
});
