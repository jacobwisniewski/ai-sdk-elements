import type { z } from "zod";
import type { AnyElementDefinition } from "./types";

const generateSchemaExample = (schema: z.ZodTypeAny): unknown => {
  const def = schema._def;
  const typeName = def?.typeName as string | undefined;

  if (typeName === "ZodString") return "example";
  if (typeName === "ZodNumber") return 0;
  if (typeName === "ZodBoolean") return true;
  if (typeName === "ZodEnum") return (def.values as string[])[0];
  if (typeName === "ZodOptional") return undefined;
  if (typeName === "ZodArray") {
    const inner = generateSchemaExample(def.type as z.ZodTypeAny);
    return [inner];
  }
  if (typeName === "ZodObject") {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(shape)) {
      const val = generateSchemaExample(value as z.ZodTypeAny);
      if (val !== undefined) obj[key] = val;
    }
    return obj;
  }

  return "...";
};

const describeSchemaFields = (schema: z.ZodTypeAny): string[] => {
  const def = schema._def;
  const typeName = def?.typeName as string | undefined;

  if (typeName !== "ZodObject") return [];

  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  const fields: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldSchema = value as z.ZodTypeAny;
    const description = fieldSchema._def?.description as string | undefined;
    const isOptional = fieldSchema._def?.typeName === "ZodOptional";
    const suffix = isOptional ? " (optional)" : "";
    const desc = description ? `: ${description}` : "";
    fields.push(`  - \`${key}\`${desc}${suffix}`);
  }

  return fields;
};

export const generateElementPrompt = (elements: ReadonlyArray<AnyElementDefinition>): string => {
  const header = `## Display Elements

Output these markers to render rich UI components. Format: \`@name{...json...}\`
Place each marker on its own line within your response.

`;

  const sections = elements.map((el) => {
    const fields = describeSchemaFields(el.schema);
    const fieldsSection = fields.length > 0 ? `\n**Fields:**\n${fields.join("\n")}\n` : "";

    const example = el.example ?? generateSchemaExample(el.schema);
    const exampleJson = JSON.stringify(example);

    return `### ${el.name}

${el.description}

**Format:** \`@${el.name}{...}\`
${fieldsSection}
**Example:** \`@${el.name}${exampleJson}\``;
  });

  return header + sections.join("\n\n");
};
