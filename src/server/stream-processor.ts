import { findMarkers, parseMarker } from "../core/parse-markers";
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

export interface StreamProcessorDeps<TDeps> {
  readonly elements: ReadonlyArray<AnyElementDefinition>;
  readonly deps: TDeps;
  readonly write: (chunk: ElementUIMessageChunk) => void;
  readonly onEnrichError?: (error: unknown, marker: ParsedMarker) => void;
}

const INITIAL_STATE: StreamProcessorState = {
  buffer: "",
  processedCount: 0,
  knownMarkerEnds: new Set(),
};

const createElementId = (index: number): string => `el-${index}`;

const emitElementPart = (
  write: (chunk: ElementUIMessageChunk) => void,
  id: string,
  data: ElementPartData,
): void => {
  write({ type: "data-element", id, data });
};

const fireEnrichment = <TDeps>(
  parsed: ParsedMarker,
  elementId: string,
  processorDeps: StreamProcessorDeps<TDeps>,
): void => {
  const element = processorDeps.elements.find((el) => el.name === parsed.name);
  if (!element) return;

  element
    .enrich(parsed.input, processorDeps.deps)
    .then((data) => {
      emitElementPart(processorDeps.write, elementId, {
        name: parsed.name,
        input: parsed.input,
        state: "ready",
        data,
      });
    })
    .catch((error: unknown) => {
      emitElementPart(processorDeps.write, elementId, {
        name: parsed.name,
        input: parsed.input,
        state: "error",
        error: error instanceof Error ? error.message : String(error),
      });
      processorDeps.onEnrichError?.(error, parsed);
    });
};

const processNewMarkers = <TDeps>(
  matches: ReadonlyArray<MarkerMatch>,
  state: StreamProcessorState,
  processorDeps: StreamProcessorDeps<TDeps>,
): StreamProcessorState =>
  matches.reduce<StreamProcessorState>((acc, match) => {
    if (acc.knownMarkerEnds.has(match.end)) return acc;

    const parsed = parseMarker(match, processorDeps.elements);
    if (!parsed) return acc;

    const elementId = createElementId(acc.processedCount);

    emitElementPart(processorDeps.write, elementId, {
      name: parsed.name,
      input: parsed.input,
      state: "loading",
    });

    fireEnrichment(parsed, elementId, processorDeps);

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

const processTextDelta = <TDeps>(
  state: StreamProcessorState,
  delta: string,
  processorDeps: StreamProcessorDeps<TDeps>,
): StreamProcessorState => {
  const newBuffer = state.buffer + delta;
  const bufferedState: StreamProcessorState = { ...state, buffer: newBuffer };
  const matches = findMarkers(newBuffer);
  const afterMarkers = processNewMarkers(matches, bufferedState, processorDeps);
  return trimBuffer(afterMarkers, matches);
};

export const createStreamProcessor = <TDeps>(
  processorDeps: StreamProcessorDeps<TDeps>,
): ((chunk: ElementUIMessageChunk) => void) => {
  const stateRef = { current: INITIAL_STATE };

  return (chunk: ElementUIMessageChunk) => {
    processorDeps.write(chunk);

    if (chunk.type !== "text-delta") return;

    stateRef.current = processTextDelta(
      stateRef.current,
      chunk.delta,
      processorDeps,
    );
  };
};
