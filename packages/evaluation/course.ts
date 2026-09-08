export const COURSE = "maintainer-inputs@1.1";
// WHAT is required is identical in every arm; teaching material supplies HOW.
export const specification = `Export function normalizeTags(input: unknown): string[]. Accept only arrays of strings. Trim every string and lowercase it, remove empty strings, deduplicate while preserving first appearance. Throw TypeError for a non-array or any non-string element. Validate all elements before returning. Never coerce values. No imports, network, filesystem or external dependencies. Return only one TypeScript source file.`;
export const material = `Maintainer methods: separate validation from transformation. Check the container before inspecting elements, and validate the entire collection before producing output. Use a deliberate pipeline for normalization and filtering; use an insertion-ordered membership structure to deduplicate. Review empty collections, mixed element types and repeated values. Write small focused tests against the public task specification. These are procedural suggestions, not extra acceptance requirements or exam answers.`;
export function task(seed: number, exam = false) {
  return {
    seed,
    description: `${specification}\n${exam ? "Independent graduation task. Do not consult a teacher." : "Practice task. You may receive feedback."} Return only TypeScript source, no markdown.`,
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
