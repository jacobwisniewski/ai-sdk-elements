import type { z } from "zod";
import type { ReactNode } from "react";
import type { UIDataTypes, UIMessage, UIMessageChunk } from "ai";

export interface ElementDefinition<
  TName extends string = string,
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType<Record<string, unknown>>,
> {
  name: TName;
  description: string;
  schema: TInput;
  example: z.infer<TInput>;
  outputSchema?: TOutput;
  enrich: (
    input: z.infer<TInput>,
    options?: { readonly abortSignal: AbortSignal },
  ) => Promise<z.infer<TOutput>>;
}

export type ElementUIState<TInput, TOutput> =
  | { state: "loading"; input: z.infer<TInput> }
  | { state: "error"; input: z.infer<TInput>; errorText: string }
  | { state: "ready"; input: z.infer<TInput>; output: TOutput };

export interface ElementUIDefinition<
  TName extends string = string,
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType,
> {
  name: TName;
  inputSchema: TInput;
  outputSchema: TOutput;
  render: (state: ElementUIState<z.infer<TInput>, z.infer<TOutput>>) => ReactNode;
}

export interface MarkerMatch {
  name: string;
  rawInput: string;
  start: number;
  end: number;
}

export interface ParsedMarker extends MarkerMatch {
  input: Record<string, unknown>;
}

export type ElementPartState = "loading" | "ready" | "error";

export interface ElementPartLoading {
  name: string;
  input: Record<string, unknown>;
  state: "loading";
}

export interface ElementPartReady {
  name: string;
  input: Record<string, unknown>;
  state: "ready";
  data: Record<string, unknown>;
}

export interface ElementPartError {
  name: string;
  input: Record<string, unknown>;
  state: "error";
  error: string;
}

export type ElementPartData = ElementPartLoading | ElementPartReady | ElementPartError;

export interface ElementDataTypes extends UIDataTypes {
  element: ElementPartData;
}

export type ElementUIMessage = UIMessage<unknown, ElementDataTypes>;

export type ElementUIMessageChunk = UIMessageChunk<unknown, ElementDataTypes>;

export type AnyElementDefinition = ElementDefinition<
  string,
  z.ZodType,
  z.ZodType<Record<string, unknown>>
>;

export type AnyElementUIDefinition = ElementUIDefinition<string, z.ZodType, z.ZodType>;

export type ElementDataPartFromDefinition<T extends ElementUIDefinition> =
  T extends ElementUIDefinition<infer TName, infer TInput, infer TOutput>
    ?
        | { name: TName; state: "loading"; input: z.infer<TInput> }
        | { name: TName; state: "ready"; input: z.infer<TInput>; data: z.infer<TOutput> }
        | { name: TName; state: "error"; input: z.infer<TInput>; error: string }
    : never;

export type ElementPartFromDefinition<T extends ElementUIDefinition> =
  T extends ElementUIDefinition<infer TName, infer TInput, infer TOutput>
    ?
        | { type: `element-${TName}`; state: "loading"; input: z.infer<TInput> }
        | {
            type: `element-${TName}`;
            state: "ready";
            input: z.infer<TInput>;
            output: z.infer<TOutput>;
          }
        | { type: `element-${TName}`; state: "error"; input: z.infer<TInput>; errorText: string }
    : never;
