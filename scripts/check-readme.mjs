import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

assert.doesNotMatch(
  readme,
  /\\`/,
  "README must use Markdown backticks directly, without escaping them",
);

const fencedBlocks = [...readme.matchAll(/^```(\w+)\n([\s\S]*?)^```$/gm)];
assert.deepEqual(
  fencedBlocks.map((match) => match[1]),
  ["bash", "bash", "json", "yaml", "sh"],
  "README executable examples must remain fenced with their expected languages",
);

const examples = fencedBlocks.map((match) => match[2]);
assert.match(examples[0], /npx lockdrift scan/);
assert.match(examples[1], /npm run check/);
assert.doesNotThrow(() => JSON.parse(examples[2]), "README config must be valid JSON");
assert.match(examples[3], /npx lockdrift scan/);
assert.match(examples[4], /npm run release:check/);

console.log("README Markdown examples are valid");
