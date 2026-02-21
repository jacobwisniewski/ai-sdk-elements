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

const makeDataPart = (
  id: string,
  data: ElementPartData,
): UIMessage["parts"][number] => ({
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
        'See <cite data-element-id="el-0"></cite> for details',
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

      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts, elements: [citeUI] }),
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

      const { result } = renderHook(() =>
        useMarkdownElements({ text, parts, elements: [citeUI] }),
      );

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
        '<cite data-element-id="el-0"></cite> then <map data-element-id="el-1"></map>',
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
});
