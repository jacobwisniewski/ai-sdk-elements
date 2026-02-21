import type { z } from "zod";
import type { ElementDefinition } from "./types";

export const defineElement = <
  TName extends string,
  TInput extends z.ZodTypeAny,
  TDeps,
>(
  definition: ElementDefinition<TName, TInput, TDeps>,
): ElementDefinition<TName, TInput, TDeps> => definition;
