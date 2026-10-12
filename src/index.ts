import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import type {
  DialogOptions as NativeDialogOptions,
  SaveDialogOptions as NativeSaveOptions,
  FolderOptions as NativeFolderOptions,
} from "./common.ts";

export type { FilterItem } from "./common.ts";
export type FolderOptions = Omit<NativeFolderOptions, "parentWindow">;
export type DialogOptions = Omit<NativeDialogOptions, "parentWindow">;
export type SaveDialogOptions = Omit<NativeSaveOptions, "parentWindow">;

type Kind =
  | "openDialog"
  | "openDialogMultiple"
  | "saveDialog"
  | "pickFolder"
  | "pickFolderMultiple";

const worker = fileURLToPath(
  new URL(import.meta.url.endsWith(".ts") ? "./worker.ts" : "./worker.mjs", import.meta.url),
);

function run(kind: Kind, options: SaveDialogOptions): Promise<string | string[] | null> {
  return new Promise((resolve, reject) => {
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new TypeError("options must be an object");
    if ("parentWindow" in options)
      throw new TypeError("parentWindow is not supported across dialog processes");

    const request = JSON.stringify({ kind, options });
    const args = process.versions.bun ? [worker] : ["--experimental-ffi", worker];
    const child = execFile(
      process.execPath,
      args,
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Dialog process failed: ${stderr.trim() || error.message}`, { cause: error }),
          );
          return;
        }

        try {
          const response = JSON.parse(stdout);
          if (typeof response.error === "string") throw new Error(response.error);

          const value: unknown = response.result;
          const multiple = kind === "openDialogMultiple" || kind === "pickFolderMultiple";

          if (
            value !== null &&
            !(multiple
              ? Array.isArray(value) && value.every((item) => typeof item === "string")
              : typeof value === "string")
          ) {
            throw new Error("Invalid dialog process response");
          }

          resolve(value as string | string[] | null);
        } catch (cause) {
          reject(cause);
        }
      },
    );
    child.stdin!.on("error", () => {
      /* Process failures are reported by execFile. */
    });
    child.stdin!.end(request);
  });
}

export function openDialog(options: DialogOptions = {}): Promise<string | null> {
  return run("openDialog", options) as Promise<string | null>;
}
export function openDialogMultiple(options: DialogOptions = {}): Promise<string[] | null> {
  return run("openDialogMultiple", options) as Promise<string[] | null>;
}
export function saveDialog(options: SaveDialogOptions = {}): Promise<string | null> {
  return run("saveDialog", options) as Promise<string | null>;
}
export function pickFolder(options: FolderOptions = {}): Promise<string | null> {
  return run("pickFolder", options) as Promise<string | null>;
}
export function pickFolderMultiple(options: FolderOptions = {}): Promise<string[] | null> {
  return run("pickFolderMultiple", options) as Promise<string[] | null>;
}
