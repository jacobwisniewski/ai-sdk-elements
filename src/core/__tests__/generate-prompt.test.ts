import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateElementPrompt } from "../generate-prompt";
import { defineElement } from "../define-element";

describe("generateElementPrompt", () => {
  describe("GIVEN a single element definition", () => {
    it("SHOULD generate a prompt with header, description, fields, and example", () => {
      const cite = defineElement({
        name: "cite",
        description: "Displays a citation with a link",
        schema: z.object({
          url: z.string().describe("The URL to cite"),
          title: z.string().describe("Display title"),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([cite]);

      expect(result).toContain("## Display Elements");
      expect(result).toContain("@name{...json...}");
      expect(result).toContain("### cite");
      expect(result).toContain("Displays a citation with a link");
      expect(result).toContain("`url`: The URL to cite");
      expect(result).toContain("`title`: Display title");
      expect(result).toContain("@cite");
    });
  });

  describe("GIVEN multiple element definitions", () => {
    it("SHOULD generate sections for each element", () => {
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

      const result = generateElementPrompt(elements);

      expect(result).toContain("### cite");
      expect(result).toContain("### map");
      expect(result).toContain("Citation");
      expect(result).toContain("Map display");
    });
  });

  describe("GIVEN an element with a custom example", () => {
    it("SHOULD use the custom example instead of auto-generated", () => {
      const cite = defineElement({
        name: "cite",
        description: "Citation",
        schema: z.object({ url: z.string(), label: z.string() }),
        example: { url: "https://docs.example.com", label: "Documentation" },
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([cite]);

      expect(result).toContain("https://docs.example.com");
      expect(result).toContain("Documentation");
    });
  });

  describe("GIVEN an element with optional fields", () => {
    it("SHOULD mark optional fields in the output", () => {
      const el = defineElement({
        name: "card",
        description: "Card display",
        schema: z.object({
          title: z.string(),
          subtitle: z.optional(z.string()),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain("`title`");
      expect(result).toContain("`subtitle`");
      expect(result).toContain("optional");
      expect(result).not.toMatch(/`title`[^`]*optional/);
      expect(result).toMatch(/`subtitle`[^`]*optional/);
    });
  });

  describe("GIVEN an element with enum fields", () => {
    it("SHOULD auto-generate example using first enum value", () => {
      const el = defineElement({
        name: "status",
        description: "Status badge",
        schema: z.object({ level: z.enum(["info", "warn", "error"]) }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain('"info"');
    });

    it("SHOULD list enum values in field description", () => {
      const el = defineElement({
        name: "status",
        description: "Status badge",
        schema: z.object({ level: z.enum(["info", "warn", "error"]) }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain('"info"');
      expect(result).toContain('"warn"');
      expect(result).toContain('"error"');
      expect(result).toContain("one of:");
    });
  });

  describe("GIVEN an element with nested object schema", () => {
    it("SHOULD auto-generate nested example", () => {
      const el = defineElement({
        name: "widget",
        description: "Widget",
        schema: z.object({
          config: z.object({ zoom: z.number() }),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain("zoom");
    });
  });

  describe("GIVEN an element with array schema", () => {
    it("SHOULD auto-generate array example", () => {
      const el = defineElement({
        name: "list",
        description: "List",
        schema: z.object({
          items: z.array(z.string()),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain('["example"]');
    });
  });

  describe("GIVEN no elements", () => {
    it("SHOULD return just the header", () => {
      const result = generateElementPrompt([]);

      expect(result).toContain("## Display Elements");
      expect(result).not.toContain("###");
    });
  });

  describe("GIVEN an element with field types", () => {
    it("SHOULD include type annotations for each field", () => {
      const el = defineElement({
        name: "profile",
        description: "User profile",
        schema: z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean(),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toMatch(/`name`[^`]*string/);
      expect(result).toMatch(/`age`[^`]*number/);
      expect(result).toMatch(/`active`[^`]*boolean/);
    });
  });

  describe("GIVEN an element with constraints", () => {
    it("SHOULD include min/max constraints in field descriptions", () => {
      const el = defineElement({
        name: "bounded",
        description: "Bounded values",
        schema: z.object({
          name: z.string().min(1).max(100),
          score: z.number().min(0).max(10),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toMatch(/`name`.*minLength: 1/);
      expect(result).toMatch(/`name`.*maxLength: 100/);
      expect(result).toMatch(/`score`.*min: 0/);
      expect(result).toMatch(/`score`.*max: 10/);
    });
  });
});
