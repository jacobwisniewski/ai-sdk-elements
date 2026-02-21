import type { z } from "zod";
import type { ElementDefinition } from "./types";

export const defineElement = <
  TName extends string,
  TInput extends z.ZodType,
  TDeps,
  TOutput extends z.ZodType = z.ZodType<Record<string, unknown>>,
>(
  definition: ElementDefinition<TName, TInput, TDeps, TOutput>,
): ElementDefinition<TName, TInput, TDeps, TOutput> => definition;
