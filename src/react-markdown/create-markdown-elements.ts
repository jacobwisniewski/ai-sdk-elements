import { useMemo, type FunctionComponent } from "react";
import type { UIMessage } from "ai";
import { isDataUIPart } from "ai";
import { findMarkers } from "../core/parse-markers";
import type { AnyElementUIDefinition, ElementPartData, MarkerMatch } from "../core/types";
import { useElementParts, ElementPartsProvider } from "./element-parts-context";

interface UseMarkdownTextOptions {
  readonly text: string;
  readonly parts: UIMessage["parts"];
  readonly elements: ReadonlyArray<AnyElementUIDefinition>;
}

interface UseMarkdownTextReturn {
  readonly processedText: string;
  readonly elementNames: ReadonlyArray<string>;
  readonly hasLoadingElements: boolean;
}

interface MarkdownRegistry {
  readonly components: Record<string, FunctionComponent<Record<string, unknown>>>;
  readonly ElementsProvider: typeof ElementPartsProvider;
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

const getElementState = (parts: UIMessage["parts"], elementId: string): string => {
  const partData = findElementPart(parts, elementId);
  return partData?.state ?? "loading";
};

const replaceMarkersWithHtml = (
  text: string,
  markers: ReadonlyArray<MarkerMatch>,
  parts: UIMessage["parts"],
): string =>
  markers.reduceRight((acc, marker, index) => {
    const elementId = `el-${index}`;
    const state = getElementState(parts, elementId);
    const htmlTag = `<${marker.name} data-element-id="${elementId}" data-element-state="${state}"></${marker.name}>`;
    return acc.slice(0, marker.start) + htmlTag + acc.slice(marker.end);
  }, text);

const createElementComponent = (
  elementDef: AnyElementUIDefinition,
): FunctionComponent<Record<string, unknown>> => {
  const Component = (props: Record<string, unknown>) => {
    const { parts } = useElementParts();
    const elementId =
      typeof props["data-element-id"] === "string" ? props["data-element-id"] : undefined;
    if (!elementId) return null;

    const partData = findElementPart(parts, elementId);

    if (!partData || partData.state === "loading") {
      return elementDef.render({
        state: "loading",
        input: partData?.input ?? {},
      });
    }

    if (partData.state === "error") {
      return elementDef.render({
        state: "error",
        input: partData.input,
        errorText: partData.error,
      });
    }

    const parsed = elementDef.outputSchema.safeParse(partData.data);
    if (!parsed.success) return null;

    return elementDef.render({
      state: "ready",
      input: partData.input,
      output: parsed.data,
    });
  };

  Component.displayName = `ElementWrapper(${elementDef.name})`;
  return Component;
};

export const createMarkdownRegistry = (
  elements: ReadonlyArray<AnyElementUIDefinition>,
): MarkdownRegistry => {
  const components = Object.fromEntries(
    elements.map((elementDef) => [elementDef.name, createElementComponent(elementDef)]),
  );

  const elementNames = [...new Set(elements.map((el) => el.name))];

  return {
    components,
    ElementsProvider: ElementPartsProvider,
    elementNames,
  };
};

export const useMarkdownText = (options: UseMarkdownTextOptions): UseMarkdownTextReturn => {
  const { text, parts, elements } = options;

  return useMemo(() => {
    const markers = findMarkers(text);
    const elementNames = [...new Set(elements.map((el) => el.name))];

    if (markers.length === 0) {
      return { processedText: text, elementNames, hasLoadingElements: false };
    }

    const hasLoadingElements = markers.some(
      (_marker, index) => getElementState(parts, `el-${index}`) === "loading",
    );

    return {
      processedText: replaceMarkersWithHtml(text, markers, parts),
      elementNames,
      hasLoadingElements,
    };
  }, [text, parts, elements]);
};
