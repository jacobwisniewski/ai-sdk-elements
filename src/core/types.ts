import type { z } from "zod";
import type { ReactNode } from "react";
import type { UIDataTypes, UIMessage, UIMessageChunk } from "ai";

export interface ElementDefinition<
  TName extends string = string,
  TInput extends z.ZodType = z.ZodType,
  TDeps = unknown,
> {
  name: TName;
  description: string;
  schema: TInput;
  enrich: (input: z.infer<TInput>, deps: TDeps) => Promise<Record<string, unknown>>;
}

export interface ElementUIDefinition<
  TName extends string = string,
  TData extends z.ZodType = z.ZodType,
> {
  name: TName;
  dataSchema: TData;
  render: (data: z.infer<TData>) => ReactNode;
  loading?: () => ReactNode;
  error?: (error: string) => ReactNode;
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

export type AnyElementDefinition = ElementDefinition<string, z.ZodType, unknown>;
export type AnyElementUIDefinition = ElementUIDefinition<string, z.ZodType>;
