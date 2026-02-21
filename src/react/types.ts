import type { ReactNode } from "react";
import type { UIMessage } from "ai";
import type { AnyElementUIDefinition, ElementPartData } from "../core/types";

export interface TextSegment {
  type: "text";
  content: string;
}

export interface ElementSegment {
  type: "element";
  name: string;
  elementId: string;
  state: ElementPartData["state"];
  render: () => ReactNode;
}

export type Segment = TextSegment | ElementSegment;

export interface UseElementsOptions {
  text: string;
  parts: UIMessage["parts"];
  elements: ReadonlyArray<AnyElementUIDefinition>;
}

export interface UseElementsReturn {
  segments: ReadonlyArray<Segment>;
}
