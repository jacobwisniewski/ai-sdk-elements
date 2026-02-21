import { z } from "zod";
import type { AnyElementDefinition } from "./types";

interface JSONSchemaObject {
  readonly type?: string;
  readonly properties?: Readonly<Record<string, JSONSchemaObject>>;
  readonly required?: ReadonlyArray<string>;
  readonly items?: JSONSchemaObject;
  readonly enum?: ReadonlyArray<unknown>;
  readonly description?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
}

const generateExampleFromSchema = (schema: JSONSchemaObject): unknown => {
  if (schema.enum) return schema.enum[0];
  if (schema.type === "string") return "example";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return true;
  if (schema.type === "array") return schema.items ? [generateExampleFromSchema(schema.items)] : [];
  if (schema.type === "object" && schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties)
        .filter(([key]) => schema.required?.includes(key) ?? false)
        .map(([key, prop]) => [key, generateExampleFromSchema(prop)]),
    );
  }
  return "...";
};

const formatConstraints = (prop: JSONSchemaObject): ReadonlyArray<string> => {
  const constraints: Array<string> = [];
  if (prop.minimum !== undefined) constraints.push(`min: ${prop.minimum}`);
  if (prop.exclusiveMinimum !== undefined) constraints.push(`min: >${prop.exclusiveMinimum}`);
  if (prop.maximum !== undefined) constraints.push(`max: ${prop.maximum}`);
  if (prop.exclusiveMaximum !== undefined) constraints.push(`max: <${prop.exclusiveMaximum}`);
  if (prop.minLength !== undefined) constraints.push(`minLength: ${prop.minLength}`);
  if (prop.maxLength !== undefined) constraints.push(`maxLength: ${prop.maxLength}`);
  if (prop.minItems !== undefined) constraints.push(`minItems: ${prop.minItems}`);
  if (prop.maxItems !== undefined) constraints.push(`maxItems: ${prop.maxItems}`);
  return constraints;
};

const describeField = (
  key: string,
  prop: JSONSchemaObject,
  required: ReadonlyArray<string>,
): string => {
  const parts: Array<string> = [`\`${key}\``];

  if (prop.description) parts.push(`: ${prop.description}`);

  const annotations: Array<string> = [];
  if (prop.type) annotations.push(prop.type);
  if (prop.enum) annotations.push(`one of: ${prop.enum.map((v) => JSON.stringify(v)).join(", ")}`);

  const constraints = formatConstraints(prop);
  if (constraints.length > 0) annotations.push(...constraints);
  if (!required.includes(key)) annotations.push("optional");

  if (annotations.length > 0) parts.push(` (${annotations.join(", ")})`);

  return `  - ${parts.join("")}`;
};

const describeSchemaFields = (jsonSchema: JSONSchemaObject): ReadonlyArray<string> => {
  if (jsonSchema.type !== "object" || !jsonSchema.properties) return [];
  const required = jsonSchema.required ?? [];
  return Object.entries(jsonSchema.properties).map(([key, prop]) =>
    describeField(key, prop, required),
  );
};

export const generateElementPrompt = (elements: ReadonlyArray<AnyElementDefinition>): string => {
  const header = `## Display Elements

Output these markers to render rich UI components. Format: \`@name{...json...}\`

`;

  const sections = elements.map((el) => {
    const jsonSchema = z.toJSONSchema(el.schema) as JSONSchemaObject;
    const fields = describeSchemaFields(jsonSchema);
    const fieldsSection = fields.length > 0 ? `\n**Fields:**\n${fields.join("\n")}\n` : "";

    const example = el.example ?? generateExampleFromSchema(jsonSchema);
    const exampleJson = JSON.stringify(example);

    return `### ${el.name}

${el.description}

**Format:** \`@${el.name}{...}\`
${fieldsSection}
**Example:** \`@${el.name}${exampleJson}\``;
  });

  return header + sections.join("\n\n");
};
