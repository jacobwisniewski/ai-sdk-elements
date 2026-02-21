import { z } from "zod";
import type { AnyElementDefinition } from "./types";

const stripNoise = (schema: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => key !== "$schema" && key !== "additionalProperties"),
  );

export const generateElementPrompt = (elements: ReadonlyArray<AnyElementDefinition>): string => {
  const header = `## Display Elements

Embed these markers in your response to render rich UI components for the user. Format: \`@name{...json...}\`

When you include a marker, the input you provide is enriched server-side (e.g. API calls, database lookups) and the result is rendered as a visual UI component that the user sees inline in your response.

`;

  const sections = elements.map((el) => {
    const jsonSchema = stripNoise(z.toJSONSchema(el.schema));

    const outputSection = el.outputSchema
      ? `

**The user will see:**
\`\`\`json
${JSON.stringify(stripNoise(z.toJSONSchema(el.outputSchema)))}
\`\`\``
      : "";

    return `### ${el.name}

${el.description}

**Input:** \`@${el.name}{...}\`
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\`${outputSection}`;
  });

  return header + sections.join("\n\n");
};
