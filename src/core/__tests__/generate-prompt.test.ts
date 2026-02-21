import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateElementPrompt } from "../generate-prompt";
import { defineElement } from "../define-element";

describe("generateElementPrompt", () => {
  it("SHOULD return just the header WHEN given no elements", () => {
    expect(generateElementPrompt([])).toMatchInlineSnapshot(`
      "## Display Elements

      Output these markers to render rich UI components. Format: \`@name{...json...}\`

      "
    `);
  });

  it("SHOULD generate a section with description, format, and compact JSON Schema", () => {
    const cite = defineElement({
      name: "cite",
      description: "Displays a citation with a link",
      schema: z.object({
        url: z.string().describe("The URL to cite"),
        title: z.string().describe("Display title"),
      }),
      enrich: async (input) => input,
    });

    expect(generateElementPrompt([cite])).toMatchInlineSnapshot(`
      "## Display Elements

      Output these markers to render rich UI components. Format: \`@name{...json...}\`

      ### cite

      Displays a citation with a link

      **Format:** \`@cite{...}\`

      **Schema:**
      \`\`\`json
      {"type":"object","properties":{"url":{"type":"string","description":"The URL to cite"},"title":{"type":"string","description":"Display title"}},"required":["url","title"]}
      \`\`\`"
    `);
  });

  it("SHOULD generate sections for multiple elements", () => {
    const elements = [
      defineElement({
        name: "cite",
        description: "Citation",
        schema: z.object({ url: z.string() }),
        enrich: async (input) => input,
      }),
      defineElement({
        name: "map",
        description: "Map display",
        schema: z.object({ lat: z.number(), lng: z.number() }),
        enrich: async (input) => input,
      }),
    ];

    expect(generateElementPrompt(elements)).toMatchInlineSnapshot(`
      "## Display Elements

      Output these markers to render rich UI components. Format: \`@name{...json...}\`

      ### cite

      Citation

      **Format:** \`@cite{...}\`

      **Schema:**
      \`\`\`json
      {"type":"object","properties":{"url":{"type":"string"}},"required":["url"]}
      \`\`\`

      ### map

      Map display

      **Format:** \`@map{...}\`

      **Schema:**
      \`\`\`json
      {"type":"object","properties":{"lat":{"type":"number"},"lng":{"type":"number"}},"required":["lat","lng"]}
      \`\`\`"
    `);
  });

  it("SHOULD include enum values and constraints in JSON Schema", () => {
    const el = defineElement({
      name: "bounded",
      description: "Bounded values",
      schema: z.object({
        level: z.enum(["info", "warn", "error"]),
        name: z.string().min(1).max(100),
      }),
      enrich: async (input) => input,
    });

    expect(generateElementPrompt([el])).toMatchInlineSnapshot(`
      "## Display Elements

      Output these markers to render rich UI components. Format: \`@name{...json...}\`

      ### bounded

      Bounded values

      **Format:** \`@bounded{...}\`

      **Schema:**
      \`\`\`json
      {"type":"object","properties":{"level":{"type":"string","enum":["info","warn","error"]},"name":{"type":"string","minLength":1,"maxLength":100}},"required":["level","name"]}
      \`\`\`"
    `);
  });

  it("SHOULD strip $schema and additionalProperties from output", () => {
    const el = defineElement({
      name: "test",
      description: "Test",
      schema: z.object({ a: z.string() }),
      enrich: async (input) => input,
    });

    const result = generateElementPrompt([el]);

    expect(result).not.toContain("$schema");
    expect(result).not.toContain("additionalProperties");
  });

  it("SHOULD include a Renders section WHEN outputSchema is provided", () => {
    const el = defineElement({
      name: "weather",
      description: "Display current weather",
      schema: z.object({ city: z.string() }),
      outputSchema: z.object({
        temperature: z.number(),
        condition: z.string(),
      }),
      enrich: async () => ({ temperature: 72, condition: "Sunny" }),
    });

    expect(generateElementPrompt([el])).toMatchInlineSnapshot(`
      "## Display Elements

      Output these markers to render rich UI components. Format: \`@name{...json...}\`

      ### weather

      Display current weather

      **Format:** \`@weather{...}\`

      **Schema:**
      \`\`\`json
      {"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}
      \`\`\`

      **Renders:**
      \`\`\`json
      {"type":"object","properties":{"temperature":{"type":"number"},"condition":{"type":"string"}},"required":["temperature","condition"]}
      \`\`\`"
    `);
  });

  it("SHOULD NOT include a Renders section WHEN outputSchema is omitted", () => {
    const el = defineElement({
      name: "cite",
      description: "Citation",
      schema: z.object({ url: z.string() }),
      enrich: async (input) => input,
    });

    const result = generateElementPrompt([el]);
    expect(result).not.toContain("Renders");
  });

  it("SHOULD strip $schema and additionalProperties from outputSchema", () => {
    const el = defineElement({
      name: "test",
      description: "Test",
      schema: z.object({ a: z.string() }),
      outputSchema: z.object({ b: z.number() }),
      enrich: async () => ({ b: 1 }),
    });

    const result = generateElementPrompt([el]);
    expect(result).not.toContain("$schema");
    expect(result).not.toContain("additionalProperties");
  });
});
