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

    const outputSection = el.outputSchema
      ? `

**Renders:**
\`\`\`json
${JSON.stringify(stripNoise(z.toJSONSchema(el.outputSchema)))}
\`\`\``
      : "";

    return `### ${el.name}

${el.description}

**Format:** \`@${el.name}{...}\`

**Schema:**
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\`${outputSection}`;
  });

  return header + sections.join("\n\n");
};
