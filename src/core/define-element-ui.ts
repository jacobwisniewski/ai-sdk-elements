import type { z } from "zod";
import type { ElementUIDefinition } from "./types";

export const defineElementUI = <TName extends string, TOutput extends z.ZodType>(
  definition: ElementUIDefinition<TName, TOutput>,
): ElementUIDefinition<TName, TOutput> => definition;
