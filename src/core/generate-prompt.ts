import { z } from "zod";
import type { AnyElementDefinition } from "./types";

const stripNoise = (schema: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "additionalProperties"),
  );

export const generateElementPrompt = (elements: ReadonlyArray<AnyElementDefinition>): string => {
  const header = `## Display Elements

Output these markers to render rich UI components. Format: \`@name{...json...}\`

`;

  const sections = elements.map((el) => {
    const jsonSchema = stripNoise(z.toJSONSchema(el.schema));

    return `### ${el.name}

${el.description}

**Format:** \`@${el.name}{...}\`

**Schema:**
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\``;
  });

  return header + sections.join("\n\n");
};
