import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateElementPrompt } from "../generate-prompt";
import { defineElement } from "../define-element";

describe("generateElementPrompt", () => {
  describe("GIVEN a single element definition", () => {
    it("SHOULD generate a prompt with header, description, format, and schema", () => {
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
      expect(result).toContain("@cite{...}");
      expect(result).toContain("```json");
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

  describe("GIVEN no elements", () => {
    it("SHOULD return just the header", () => {
      const result = generateElementPrompt([]);

      expect(result).toContain("## Display Elements");
      expect(result).not.toContain("###");
    });
  });

  describe("GIVEN an element with .describe() on fields", () => {
    it("SHOULD include descriptions in the JSON Schema output", () => {
      const el = defineElement({
        name: "weather",
        description: "Weather display",
        schema: z.object({
          city: z.string().describe("City name"),
          units: z.enum(["celsius", "fahrenheit"]).describe("Temperature unit"),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain('"description": "City name"');
      expect(result).toContain('"description": "Temperature unit"');
    });
  });

  describe("GIVEN an element schema with enums and constraints", () => {
    it("SHOULD include enum values and constraints in the JSON Schema output", () => {
      const el = defineElement({
        name: "bounded",
        description: "Bounded values",
        schema: z.object({
          level: z.enum(["info", "warn", "error"]),
          name: z.string().min(1).max(100),
        }),
        enrich: async (input) => input,
      });

      const result = generateElementPrompt([el]);

      expect(result).toContain('"enum"');
      expect(result).toContain('"info"');
      expect(result).toContain('"minLength": 1');
      expect(result).toContain('"maxLength": 100');
    });
  });

  describe("GIVEN the JSON Schema output", () => {
    it("SHOULD strip $schema and additionalProperties", () => {
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
  });
});
