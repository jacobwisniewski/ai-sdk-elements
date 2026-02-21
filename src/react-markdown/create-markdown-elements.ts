import { useMemo, type FunctionComponent } from "react";
import type { UIMessage } from "ai";
import { isDataUIPart } from "ai";
import { findMarkers } from "../core/parse-markers";
import type { AnyElementUIDefinition, ElementPartData, MarkerMatch } from "../core/types";

interface UseMarkdownElementsOptions {
  readonly text: string;
  readonly parts: UIMessage["parts"];
  readonly elements: ReadonlyArray<AnyElementUIDefinition>;
}

interface UseMarkdownElementsReturn {
  readonly processedText: string;
  readonly components: Readonly<Record<string, FunctionComponent<Record<string, string>>>>;
  readonly elementNames: ReadonlyArray<string>;
}

const isElementDataPart = (
  part: UIMessage["parts"][number],
): part is { type: "data-element"; id: string; data: ElementPartData } =>
  isDataUIPart(part) &&
  part.type === "data-element" &&
  typeof part.id === "string" &&
  part.data !== null &&
  typeof part.data === "object";

const findElementPart = (
  parts: UIMessage["parts"],
  elementId: string,
): ElementPartData | undefined => {
  const part = parts.find(
    (p): p is { type: "data-element"; id: string; data: ElementPartData } =>
      isElementDataPart(p) && p.id === elementId,
  );
  return part?.data;
};

const replaceMarkersWithHtml = (text: string, markers: ReadonlyArray<MarkerMatch>): string =>
  markers.reduceRight((acc, marker, index) => {
    const elementId = `el-${index}`;
    const htmlTag = `<${marker.name} data-element-id="${elementId}"></${marker.name}>`;
    return acc.slice(0, marker.start) + htmlTag + acc.slice(marker.end);
  }, text);

const createElementComponent =
  (
    elementDef: AnyElementUIDefinition,
    parts: UIMessage["parts"],
  ): FunctionComponent<Record<string, string>> =>
  (props: Record<string, string>) => {
    const elementId = props["data-element-id"];
    if (!elementId) return null;

    const partData = findElementPart(parts, elementId);

    if (!partData || partData.state === "loading") {
      return elementDef.loading?.() ?? null;
    }

    if (partData.state === "error") {
      return elementDef.error?.(partData.error) ?? null;
    }

    const parsed = elementDef.dataSchema.safeParse(partData.data);
    return parsed.success ? elementDef.render(parsed.data) : null;
  };

const buildComponents = (
  elements: ReadonlyArray<AnyElementUIDefinition>,
  parts: UIMessage["parts"],
): Readonly<Record<string, FunctionComponent<Record<string, string>>>> =>
  Object.fromEntries(
    elements.map((elementDef) => [elementDef.name, createElementComponent(elementDef, parts)]),
  );

export const useMarkdownElements = (
  options: UseMarkdownElementsOptions,
): UseMarkdownElementsReturn => {
  const { text, parts, elements } = options;

  return useMemo(() => {
    const markers = findMarkers(text);
    const elementNames = [...new Set(elements.map((el) => el.name))];

    if (markers.length === 0) {
      return { processedText: text, components: {}, elementNames };
    }

    return {
      processedText: replaceMarkersWithHtml(text, markers),
      components: buildComponents(elements, parts),
      elementNames,
    };
  }, [text, parts, elements]);
};
