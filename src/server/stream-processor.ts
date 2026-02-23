import { findMarkers, parseMarker } from "../core/parse-markers";
import { isAbortException } from "./is-abort-exception";
import type {
  AnyElementDefinition,
  ElementPartData,
  ElementUIMessageChunk,
  MarkerMatch,
  ParsedMarker,
} from "../core/types";

interface StreamProcessorState {
  readonly buffer: string;
  readonly processedCount: number;
  readonly knownMarkerEnds: ReadonlySet<number>;
}

export interface StreamProcessorDeps {
  readonly elements: ReadonlyArray<AnyElementDefinition>;
  readonly abortSignal: AbortSignal;
  readonly write: (chunk: ElementUIMessageChunk) => void;
  readonly onEnrichError?: (error: unknown, marker: ParsedMarker) => void;
}

export interface StreamProcessor {
  readonly process: (chunk: ElementUIMessageChunk) => void;
  readonly flush: (aborted?: boolean) => Promise<void>;
}

const INITIAL_STATE: StreamProcessorState = {
  buffer: "",
  processedCount: 0,
  knownMarkerEnds: new Set(),
};

const createElementId = (index: number): string => `el-${index}`;

const emitElementPart = (
  abortSignal: AbortSignal,
  write: (chunk: ElementUIMessageChunk) => void,
  id: string,
  data: ElementPartData,
): void => {
  if (abortSignal.aborted) return;
  write({ type: "data-element", id, data });
};

const fireEnrichment = (
  parsed: ParsedMarker,
  elementId: string,
  processorDeps: StreamProcessorDeps,
): Promise<void> => {
  const element = processorDeps.elements.find((el) => el.name === parsed.name);
  if (!element) return Promise.resolve();

  return element
    .enrich(parsed.input, { abortSignal: processorDeps.abortSignal })
    .then((data) => {
      emitElementPart(processorDeps.abortSignal, processorDeps.write, elementId, {
        name: parsed.name,
        input: parsed.input,
        state: "ready",
        data,
      });
    })
    .catch((error: unknown) => {
      if (processorDeps.abortSignal.aborted || isAbortException(error)) return;

      emitElementPart(processorDeps.abortSignal, processorDeps.write, elementId, {
        name: parsed.name,
        input: parsed.input,
        state: "error",
        error: error instanceof Error ? error.message : String(error),
      });
      processorDeps.onEnrichError?.(error, parsed);
    });
};

const processNewMarkers = (
  matches: ReadonlyArray<MarkerMatch>,
  state: StreamProcessorState,
  processorDeps: StreamProcessorDeps,
  pending: Array<Promise<void>>,
): StreamProcessorState =>
  matches.reduce<StreamProcessorState>((acc, match) => {
    if (acc.knownMarkerEnds.has(match.end)) return acc;

    const parsed = parseMarker(match, processorDeps.elements);
    if (!parsed) return acc;

    const elementId = createElementId(acc.processedCount);

    emitElementPart(processorDeps.abortSignal, processorDeps.write, elementId, {
      name: parsed.name,
      input: parsed.input,
      state: "loading",
    });

    pending.push(fireEnrichment(parsed, elementId, processorDeps));

    return {
      ...acc,
      processedCount: acc.processedCount + 1,
      knownMarkerEnds: new Set([...acc.knownMarkerEnds, match.end]),
    };
  }, state);

const trimBuffer = (
  state: StreamProcessorState,
  matches: ReadonlyArray<MarkerMatch>,
): StreamProcessorState => {
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return state;

  return {
    ...state,
    buffer: state.buffer.slice(lastMatch.end),
    knownMarkerEnds: new Set(),
  };
};

const processTextDelta = (
  state: StreamProcessorState,
  delta: string,
  processorDeps: StreamProcessorDeps,
  pending: Array<Promise<void>>,
): StreamProcessorState => {
  const newBuffer = state.buffer + delta;
  const bufferedState: StreamProcessorState = { ...state, buffer: newBuffer };
  const matches = findMarkers(newBuffer);
  const afterMarkers = processNewMarkers(matches, bufferedState, processorDeps, pending);
  return trimBuffer(afterMarkers, matches);
};

export const createStreamProcessor = (processorDeps: StreamProcessorDeps): StreamProcessor => {
  const stateRef = { current: INITIAL_STATE };
  const pending: Array<Promise<void>> = [];

  return {
    process: (chunk: ElementUIMessageChunk) => {
      processorDeps.write(chunk);

      if (chunk.type !== "text-delta") return;

      stateRef.current = processTextDelta(stateRef.current, chunk.delta, processorDeps, pending);
    },
    flush: (aborted) =>
      aborted || processorDeps.abortSignal.aborted
        ? Promise.resolve()
        : Promise.all(pending).then(() => undefined),
  };
};
