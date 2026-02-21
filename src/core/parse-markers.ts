import type { MarkerMatch, ParsedMarker, AnyElementDefinition } from "./types";

const findClosingBrace = (text: string, from: number): number => {
  const search = (index: number, depth: number): number => {
    if (index >= text.length) return -1;
    if (text[index] === "{") return search(index + 1, depth + 1);
    if (text[index] === "}") return depth === 1 ? index + 1 : search(index + 1, depth - 1);
    return search(index + 1, depth);
  };
  return search(from, 0);
};

const collectMatches = (text: string, regex: RegExp): ReadonlyArray<RegExpExecArray> => {
  const result = regex.exec(text);
  if (!result) return [];
  return [result, ...collectMatches(text, regex)];
};

export const findMarkers = (text: string): ReadonlyArray<MarkerMatch> =>
  collectMatches(text, /@(\w+)\{/g).reduce<ReadonlyArray<MarkerMatch>>((acc, match) => {
    const name = match[1];
    const jsonStart = match.index + match[0].length - 1;
    const jsonEnd = findClosingBrace(text, jsonStart);

    return jsonEnd === -1
      ? acc
      : [
          ...acc,
          {
            name,
            rawInput: text.slice(jsonStart, jsonEnd),
            start: match.index,
            end: jsonEnd,
          },
        ];
  }, []);

export const parseMarker = (
  match: MarkerMatch,
  elements: ReadonlyArray<AnyElementDefinition>,
): ParsedMarker | null => {
  const element = elements.find((el) => el.name === match.name);
  if (!element) return null;

  try {
    const parsed = JSON.parse(match.rawInput) as Record<string, unknown>;
    const result = element.schema.safeParse(parsed);
    if (!result.success) return null;

    return { ...match, input: result.data as Record<string, unknown> };
  } catch {
    return null;
  }
};

export const parseMarkers = (
  text: string,
  elements: ReadonlyArray<AnyElementDefinition>,
): ReadonlyArray<ParsedMarker> =>
  findMarkers(text).reduce<ReadonlyArray<ParsedMarker>>((acc, match) => {
    const result = parseMarker(match, elements);
    return result ? [...acc, result] : acc;
  }, []);

export const hasPartialMarker = (text: string): boolean => {
  const lastAt = text.lastIndexOf("@");
  if (lastAt === -1) return false;

  const afterAt = text.slice(lastAt);
  if (/^@\w*$/.test(afterAt)) return true;

  const openBraces = (afterAt.match(/\{/g) ?? []).length;
  const closeBraces = (afterAt.match(/\}/g) ?? []).length;
  return openBraces > closeBraces;
};
