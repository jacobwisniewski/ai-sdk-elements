import type { z } from "zod";
import type { ElementUIDefinition } from "./types";

export const defineElementUI = <
  TName extends string,
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
>(
  definition: ElementUIDefinition<TName, TInput, TOutput>,
): ElementUIDefinition<TName, TInput, TOutput> => definition;
