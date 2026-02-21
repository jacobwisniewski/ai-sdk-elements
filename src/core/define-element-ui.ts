import type { z } from "zod";
import type { ElementUIDefinition } from "./types";

export const defineElementUI = <
  TName extends string,
  TData extends z.ZodTypeAny,
>(
  definition: ElementUIDefinition<TName, TData>,
): ElementUIDefinition<TName, TData> => definition;
