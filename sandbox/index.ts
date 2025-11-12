import { Pieper, type SafeResult } from "../src";

async function slugify(
  title: string | null | undefined
): Promise<SafeResult<string>> {
  const pipe = Pieper.of(title)
    .assert(
      (s): s is string => typeof s === "string" && s.trim().length !== 0,
      "Input title cannot be empty"
    )
    .log("1. Original:")
    .map((s) => s.toLowerCase())
    .map((s) => s.normalize("NFD"))
    .map((s) => s.replace(/[\u0300-\u036f]/g, ""))
    .log("2. Normalized/Lowercased:")
    .map((s) => s.replace(/[^a-z0-9]+/g, "-"))
    .log("3. Hyphenated:")
    .map((s) => s.replace(/^-+|-+$/g, ""))
    .log("4. Trimmed:")
    .ifElse(
      (s) => s.length > 0,
      (s) => s,
      () => "n-a"
    );

  return pipe.runSafe();
}

async function runExample() {
  console.log("--- Running examples ---");

  const testCases = [
    "A (really) cool Title! 🚀",
    "Føø Bår & Båz",
    "---JUST SYMBOLS---",
    "@#$!",
    null,
  ];

  for (const testCase of testCases) {
    const result = await slugify(testCase);

    if (result.ok) {
      console.log(`✅ Input: "${testCase}"  ->  Output: "${result.value}"`);
    } else {
      console.log(
        `❌ Input: "${testCase}"  ->  Error: ${result.error.message}`
      );
    }
  }
}

runExample();
