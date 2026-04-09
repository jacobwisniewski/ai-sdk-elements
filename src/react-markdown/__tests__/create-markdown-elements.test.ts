// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";
import type { UIMessage } from "ai";
import { useMarkdownText } from "../create-markdown-elements";
import { defineElementUI } from "../../core/define-element-ui";
import { createElement } from "react";
import type { ElementPartData } from "../../core/types";

const citeInputSchema = z.object({ url: z.string() });
const citeOutputSchema = z.object({ title: z.string(), url: z.string() });

const citeUI = defineElementUI({
  name: "cite",
  inputSchema: citeInputSchema,
  outputSchema: citeOutputSchema,
  render: (state) => {
    if (state.state === "loading") return createElement("span", null, "Loading...");
    if (state.state === "error")
      return createElement("span", { className: "error" }, state.errorText);
    return createElement("a", { href: state.output.url }, state.output.title);
  },
});

const mapInputSchema = z.object({ lat: z.number(), lng: z.number() });
const mapOutputSchema = z.object({ lat: z.number(), lng: z.number() });

const mapUI = defineElementUI({
  name: "map",
  inputSchema: mapInputSchema,
  outputSchema: mapOutputSchema,
  render: (state) => {
    if (state.state !== "ready") return null;
    return createElement("div", null, `${state.output.lat},${state.output.lng}`);
  },
});

const makeDataPart = (id: string, data: ElementPartData): UIMessage["parts"][number] => ({
  type: "data-element" as const,
  id,
  data,
});

describe("useMarkdownText", () => {
  describe("WHEN text has no markers", () => {
    it("SHOULD return original text unchanged", () => {
      const { result } = renderHook(() =>
        useMarkdownText({ text: "Hello world", parts: [], elements: [] }),
      );

      expect(result.current.processedText).toBe("Hello world");
    });

    it("SHOULD return empty elementNames array", () => {
      const { result } = renderHook(() =>
        useMarkdownText({ text: "Hello world", parts: [], elements: [] }),
      );

      expect(result.current.elementNames).toEqual([]);
    });

    it("SHOULD return hasLoadingElements as false", () => {
      const { result } = renderHook(() =>
        useMarkdownText({ text: "Hello world", parts: [], elements: [] }),
      );

      expect(result.current.hasLoadingElements).toBe(false);
    });
  });

  describe("WHEN text has a single marker", () => {
    it("SHOULD replace marker with HTML tag containing data-element-id", () => {
      const text = 'See @cite{"url":"https://x.com"} for details';
      const { result } = renderHook(() => useMarkdownText({ text, parts: [], elements: [citeUI] }));

      expect(result.current.processedText).toContain('<cite data-element-id="el-0"');
      expect(result.current.processedText).toContain("</cite>");
    });

    it("SHOULD include data-element-state='loading' when no matching part exists", () => {
      const text = '@cite{"url":"https://x.com"}';
      const { result } = renderHook(() => useMarkdownText({ text, parts: [], elements: [citeUI] }));

      expect(result.current.processedText).toContain('data-element-state="loading"');
    });

    it("SHOULD include data-element-state='ready' when matching part is ready", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      const { result } = renderHook(() => useMarkdownText({ text, parts, elements: [citeUI] }));

      expect(result.current.processedText).toBe(
        '<cite data-element-id="el-0" data-element-state="ready"></cite>',
      );
    });

    it("SHOULD include data-element-state='error' when matching part has error", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "error",
          error: "Not found",
        }),
      ];

      const { result } = renderHook(() => useMarkdownText({ text, parts, elements: [citeUI] }));

      expect(result.current.processedText).toContain('data-element-state="error"');
    });

    it("SHOULD include element name in elementNames", () => {
      const text = '@cite{"url":"x.com"}';
      const { result } = renderHook(() => useMarkdownText({ text, parts: [], elements: [citeUI] }));

      expect(result.current.elementNames).toEqual(["cite"]);
    });

    it("SHOULD set hasLoadingElements to true when no matching part exists", () => {
      const text = '@cite{"url":"x.com"}';
      const { result } = renderHook(() => useMarkdownText({ text, parts: [], elements: [citeUI] }));

      expect(result.current.hasLoadingElements).toBe(true);
    });

    it("SHOULD set hasLoadingElements to false when part is ready", () => {
      const text = '@cite{"url":"https://x.com"}';
      const parts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "ready",
          data: { title: "Example", url: "https://x.com" },
        }),
      ];

      const { result } = renderHook(() => useMarkdownText({ text, parts, elements: [citeUI] }));

      expect(result.current.hasLoadingElements).toBe(false);
    });
  });

  describe("WHEN text has multiple markers", () => {
    it("SHOULD replace all markers with HTML tags", () => {
      const text = '@cite{"url":"a.com"} then @map{"lat":1,"lng":2}';
      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts: [],
          elements: [citeUI, mapUI],
        }),
      );

      expect(result.current.processedText).toContain('<cite data-element-id="el-0"');
      expect(result.current.processedText).toContain('<map data-element-id="el-1"');
    });

    it("SHOULD assign sequential element IDs", () => {
      const text = '@cite{"url":"a.com"} @cite{"url":"b.com"}';
      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts: [],
          elements: [citeUI],
        }),
      );

      expect(result.current.processedText).toContain('data-element-id="el-0"');
      expect(result.current.processedText).toContain('data-element-id="el-1"');
    });

    it("SHOULD deduplicate element names", () => {
      const text = '@cite{"url":"a.com"} @cite{"url":"b.com"}';
      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts: [],
          elements: [citeUI],
        }),
      );

      expect(result.current.elementNames).toEqual(["cite"]);
    });

    it("SHOULD include all unique element names", () => {
      const text = '@cite{"url":"a.com"} then @map{"lat":1,"lng":2}';
      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts: [],
          elements: [citeUI, mapUI],
        }),
      );

      expect(result.current.elementNames).toEqual(["cite", "map"]);
    });

    it("SHOULD set hasLoadingElements true if any element is loading", () => {
      const text = '@cite{"url":"a.com"} then @cite{"url":"b.com"}';
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

      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts,
          elements: [citeUI],
        }),
      );

      expect(result.current.hasLoadingElements).toBe(true);
    });

    it("SHOULD set hasLoadingElements false when all elements are ready", () => {
      const text = '@cite{"url":"a.com"} then @cite{"url":"b.com"}';
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
          state: "ready",
          data: { title: "B", url: "b.com" },
        }),
      ];

      const { result } = renderHook(() =>
        useMarkdownText({
          text,
          parts,
          elements: [citeUI],
        }),
      );

      expect(result.current.hasLoadingElements).toBe(false);
    });
  });

  describe("WHEN element state transitions", () => {
    it("SHOULD update processedText from loading to ready", () => {
      const text = '@cite{"url":"https://x.com"}';
      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownText({ text, parts, elements: [citeUI] }),
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

    it("SHOULD update processedText from loading to error", () => {
      const text = '@cite{"url":"https://x.com"}';
      const loadingParts: UIMessage["parts"] = [
        makeDataPart("el-0", {
          name: "cite",
          input: { url: "https://x.com" },
          state: "loading",
        }),
      ];

      const { result, rerender } = renderHook(
        ({ parts }) => useMarkdownText({ text, parts, elements: [citeUI] }),
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
        ({ parts }) => useMarkdownText({ text, parts, elements: [citeUI] }),
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
        ({ parts }) => useMarkdownText({ text, parts, elements: [citeUI] }),
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
    });
  });
});
