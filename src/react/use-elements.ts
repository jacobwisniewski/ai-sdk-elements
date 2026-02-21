import { useMemo } from "react";
import type { UIMessage } from "ai";
import { isDataUIPart } from "ai";
import { findMarkers } from "../core/parse-markers";
import type {
  AnyElementUIDefinition,
  ElementPartData,
  MarkerMatch,
} from "../core/types";
import type {
  Segment,
  ElementSegment,
  UseElementsOptions,
  UseElementsReturn,
} from "./types";

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

const createElementSegment = (
  elementId: string,
  name: string,
  partData: ElementPartData | undefined,
  elementDef: AnyElementUIDefinition | undefined,
): ElementSegment => ({
  type: "element",
  name,
  elementId,
  state: partData?.state ?? "loading",
  render: () => {
    if (!elementDef) return null;

    if (!partData || partData.state === "loading") {
      return elementDef.loading?.() ?? null;
    }

    if (partData.state === "error") {
      return elementDef.error?.(partData.error) ?? null;
    }

    const parsed = elementDef.dataSchema.safeParse(partData.data);
    return parsed.success ? elementDef.render(parsed.data) : null;
  },
});

const markersToSegments = (
  text: string,
  markers: ReadonlyArray<MarkerMatch>,
  parts: UIMessage["parts"],
  elements: ReadonlyArray<AnyElementUIDefinition>,
): ReadonlyArray<Segment> => {
  const pairs = markers.map((marker, index) => ({
    marker,
    elementId: `el-${index}`,
  }));

  const segments = pairs.flatMap(({ marker, elementId }, index) => {
    const prevEnd = index === 0 ? 0 : pairs[index - 1].marker.end;
    const textBefore = text.slice(prevEnd, marker.start);
    const partData = findElementPart(parts, elementId);
    const elementDef = elements.find((el) => el.name === marker.name);

    const textSegment: ReadonlyArray<Segment> = textBefore
      ? [{ type: "text" as const, content: textBefore }]
      : [];

    return [
      ...textSegment,
      createElementSegment(elementId, marker.name, partData, elementDef),
    ];
  });

  const lastEnd = markers[markers.length - 1]?.end ?? 0;
  const trailing = text.slice(lastEnd);
  const trailingSegment: ReadonlyArray<Segment> = trailing
    ? [{ type: "text" as const, content: trailing }]
    : [];

  return [...segments, ...trailingSegment];
};

export const useElements = (options: UseElementsOptions): UseElementsReturn => {
  const { text, parts, elements } = options;

  const segments = useMemo((): ReadonlyArray<Segment> => {
    const markers = findMarkers(text);

    if (markers.length === 0) {
      return text ? [{ type: "text" as const, content: text }] : [];
    }

    return markersToSegments(text, markers, parts, elements);
  }, [text, parts, elements]);

  return { segments };
};
