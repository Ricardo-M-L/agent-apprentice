export const COURSE = "maintainer-inputs@1.0";
export const material = `You maintain a TypeScript input-validation library. Export function normalizeTags(input: unknown): string[]. Accept only arrays of strings. Trim every string and lowercase it, remove empty strings, deduplicate while preserving first appearance. Throw TypeError for a non-array or any non-string element. Validate all elements before returning. Never coerce values. No imports, network, filesystem or external dependencies. Return only one TypeScript source file. These conventions are public teaching material, not exam answers.`;
export function task(seed: number, exam = false) {
  return {
    seed,
    description: `Implement export function normalizeTags(input: unknown): string[] for a tags library. Preserve insertion order. ${exam ? "Independent graduation task. Do not consult a teacher." : "Practice task. You may receive feedback."} ${seed % 2 ? "The library is used by a case-insensitive search index." : "The library rejects invalid user inputs rather than coercing them."} Return only TypeScript source, no markdown.`,
    file: "solution.ts",
  };
}
export function referenceCode() {
  return `export function normalizeTags(input: unknown): string[] { if (!Array.isArray(input) || input.some(x => typeof x !== 'string')) throw new TypeError('Expected strings'); return [...new Set(input.map(x => x.trim().toLowerCase()).filter(Boolean))]; }`;
}
export function weakCode() {
  return `export function normalizeTags(input: unknown): string[] { return (input as string[]).map(x => x.trim()); }`;
}
export interface Check {
  name: string;
  input: unknown;
  expected?: string[];
  throws?: boolean;
}
export function checks(seed: number): Check[] {
  const word = "tag" + seed.toString(36);
  return [
    {
      name: "normalize and deduplicate",
      input: [" " + word.toUpperCase() + " ", word, " other "],
      expected: [word, "other"],
    },
    { name: "remove blanks", input: ["", "   ", " X "], expected: ["x"] },
    { name: "reject mixed array", input: ["ok", seed], throws: true },
    { name: "reject non-array", input: { tags: ["x"] }, throws: true },
    {
      name: "preserve order",
      input: [" B ", "a", "b", " C "],
      expected: ["b", "a", "c"],
    },
    { name: "empty array", input: [], expected: [] },
  ];
}
