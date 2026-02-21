import { describe, it, expect } from "vitest";
import { z } from "zod";
import { findMarkers, parseMarker, parseMarkers, hasPartialMarker } from "../parse-markers";
import { defineElement } from "../define-element";

describe("findMarkers", () => {
  describe("GIVEN text with no markers", () => {
    it("SHOULD return empty array for plain text", () => {
      expect(findMarkers("hello world")).toMatchInlineSnapshot(`[]`);
    });

    it("SHOULD return empty array for empty string", () => {
      expect(findMarkers("")).toMatchInlineSnapshot(`[]`);
    });

    it("SHOULD ignore @ without a following brace", () => {
      expect(findMarkers("email@example.com")).toMatchInlineSnapshot(`[]`);
    });
  });

  describe("GIVEN text with a single marker", () => {
    it("SHOULD find a simple marker", () => {
      expect(findMarkers('@cite{"url":"https://example.com"}')).toMatchInlineSnapshot(`
        [
          {
            "end": 34,
            "name": "cite",
            "rawInput": "{"url":"https://example.com"}",
            "start": 0,
          },
        ]
      `);
    });

    it("SHOULD find a marker embedded in text", () => {
      const text = 'Here is a citation @cite{"id":"123"} and more text';
      const result = findMarkers(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchInlineSnapshot(`
        {
          "end": 36,
          "name": "cite",
          "rawInput": "{"id":"123"}",
          "start": 19,
        }
      `);
    });

    it("SHOULD handle nested braces in JSON values", () => {
      const text = '@map{"config":{"zoom":10},"center":[0,0]}';
      const result = findMarkers(text);
      expect(result).toHaveLength(1);
      expect(result[0].rawInput).toBe('{"config":{"zoom":10},"center":[0,0]}');
    });

    it("SHOULD handle deeply nested braces", () => {
      const text = '@el{"a":{"b":{"c":{"d":1}}}}';
      const result = findMarkers(text);
      expect(result).toHaveLength(1);
      expect(result[0].rawInput).toBe('{"a":{"b":{"c":{"d":1}}}}');
    });
  });

  describe("GIVEN text with multiple markers", () => {
    it("SHOULD find all markers", () => {
      const text = 'Hello @cite{"id":"1"} world @map{"lat":0,"lng":0} done';
      const result = findMarkers(text);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("cite");
      expect(result[1].name).toBe("map");
    });

    it("SHOULD track correct start/end positions for each marker", () => {
      const text = '@a{"x":1} @b{"y":2}';
      const result = findMarkers(text);
      expect(result[0]).toMatchInlineSnapshot(`
        {
          "end": 9,
          "name": "a",
          "rawInput": "{"x":1}",
          "start": 0,
        }
      `);
      expect(result[1]).toMatchInlineSnapshot(`
        {
          "end": 19,
          "name": "b",
          "rawInput": "{"y":2}",
          "start": 10,
        }
      `);
    });
  });

  describe("GIVEN text with unclosed braces", () => {
    it("SHOULD skip markers with unclosed braces", () => {
      expect(findMarkers('@broken{"incomplete')).toMatchInlineSnapshot(`[]`);
    });

    it("SHOULD find complete markers while skipping incomplete ones", () => {
      const text = '@good{"x":1} @bad{"incomplete';
      const result = findMarkers(text);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("good");
    });
  });
});

describe("parseMarker", () => {
  const testElement = defineElement({
    name: "cite",
    description: "Citation",
    schema: z.object({ url: z.string() }),
    enrich: async (input) => input,
  });

  describe("GIVEN a valid marker matching a known element", () => {
    it("SHOULD parse and validate the input", () => {
      const marker = {
        name: "cite",
        rawInput: '{"url":"https://example.com"}',
        start: 0,
        end: 34,
      };
      const result = parseMarker(marker, [testElement]);
      expect(result).toMatchInlineSnapshot(`
        {
          "end": 34,
          "input": {
            "url": "https://example.com",
          },
          "name": "cite",
          "rawInput": "{"url":"https://example.com"}",
          "start": 0,
        }
      `);
    });
  });

  describe("GIVEN a marker for an unknown element", () => {
    it("SHOULD return null", () => {
      const marker = {
        name: "unknown",
        rawInput: '{"x":1}',
        start: 0,
        end: 16,
      };
      expect(parseMarker(marker, [testElement])).toBeNull();
    });
  });

  describe("GIVEN a marker with invalid JSON", () => {
    it("SHOULD return null", () => {
      const marker = {
        name: "cite",
        rawInput: "{not valid json}",
        start: 0,
        end: 22,
      };
      expect(parseMarker(marker, [testElement])).toBeNull();
    });
  });

  describe("GIVEN a marker with JSON that fails schema validation", () => {
    it("SHOULD return null", () => {
      const marker = {
        name: "cite",
        rawInput: '{"wrongField":"value"}',
        start: 0,
        end: 28,
      };
      expect(parseMarker(marker, [testElement])).toBeNull();
    });
  });
});

describe("parseMarkers", () => {
  const elements = [
    defineElement({
      name: "cite",
      description: "Citation",
      schema: z.object({ url: z.string() }),
      enrich: async (input) => input,
    }),
    defineElement({
      name: "map",
      description: "Map",
      schema: z.object({ lat: z.number(), lng: z.number() }),
      enrich: async (input) => input,
    }),
  ];

  describe("GIVEN text with valid markers", () => {
    it("SHOULD parse all valid markers", () => {
      const text = 'Check @cite{"url":"https://x.com"} and @map{"lat":1,"lng":2} here';
      const result = parseMarkers(text, elements);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("cite");
      expect(result[0].input).toEqual({ url: "https://x.com" });
      expect(result[1].name).toBe("map");
      expect(result[1].input).toEqual({ lat: 1, lng: 2 });
    });
  });

  describe("GIVEN text with a mix of valid and invalid markers", () => {
    it("SHOULD only return valid parsed markers", () => {
      const text = '@cite{"url":"ok"} @unknown{"x":1} @map{"lat":0,"lng":"bad"}';
      const result = parseMarkers(text, elements);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("cite");
    });
  });

  describe("GIVEN text with no markers", () => {
    it("SHOULD return empty array", () => {
      expect(parseMarkers("plain text", elements)).toMatchInlineSnapshot(`[]`);
    });
  });
});

describe("hasPartialMarker", () => {
  describe("GIVEN text with a partial marker at the end", () => {
    it("SHOULD detect @name without brace", () => {
      expect(hasPartialMarker("text @cit")).toBe(true);
    });

    it("SHOULD detect lone @", () => {
      expect(hasPartialMarker("text @")).toBe(true);
    });

    it("SHOULD detect unclosed brace", () => {
      expect(hasPartialMarker('text @cite{"url":"htt')).toBe(true);
    });

    it("SHOULD detect nested unclosed braces", () => {
      expect(hasPartialMarker('@map{"config":{"zoom":10')).toBe(true);
    });
  });

  describe("GIVEN text with no partial marker", () => {
    it("SHOULD return false for complete markers", () => {
      expect(hasPartialMarker('@cite{"url":"done"}')).toBe(false);
    });

    it("SHOULD return false for plain text", () => {
      expect(hasPartialMarker("hello world")).toBe(false);
    });

    it("SHOULD return false for text with no @", () => {
      expect(hasPartialMarker("no at sign here")).toBe(false);
    });

    it("SHOULD return false for email-like text not at end", () => {
      expect(hasPartialMarker("email@example.com is fine")).toBe(false);
    });
  });
});
