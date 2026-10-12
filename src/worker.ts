import { readFileSync } from "node:fs";

let response: { result: string | string[] | null } | { error: string };
try {
  const { kind, options } = JSON.parse(readFileSync(0, "utf8"));
  const kinds = [
    "openDialog",
    "openDialogMultiple",
    "saveDialog",
    "pickFolder",
    "pickFolderMultiple",
  ] as const;

  if (!kinds.includes(kind)) throw new Error("Unknown dialog kind");

  const { api } = await (process.versions.bun ? import("./bun.ts") : import("./node.ts"));

  api.init();
  try {
    response = { result: api[kind as (typeof kinds)[number]](options) };
  } finally {
    api.quit();
  }
} catch (error) {
  response = { error: error instanceof Error ? error.message : String(error) };
}

process.stdout.write(JSON.stringify(response), () => process.exit(0));
