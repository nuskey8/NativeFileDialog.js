import { endianness } from "node:os";
import { fileURLToPath } from "node:url";
import { isMainThread } from "node:worker_threads";

export interface FilterItem {
  name: string;
  /** Comma-separated extensions, e.g. "png,jpg". */
  spec: string;
}

export interface WindowHandle {
  type: "windows" | "cocoa" | "x11" | "wayland";
  handle: bigint;
}

export interface FolderOptions {
  defaultPath?: string;
  parentWindow?: WindowHandle;
  title?: string;
  acceptLabel?: string;
  cancelLabel?: string;
}

export interface DialogOptions extends FolderOptions {
  filterList?: readonly FilterItem[];
}

export interface SaveDialogOptions extends DialogOptions {
  defaultName?: string;
}

export const pointerSize = ["ia32", "arm"].includes(process.arch) ? 4 : 8;
export const pathSetSize = process.platform === "darwin" ? pointerSize : 4;
const littleEndian = endianness() === "LE";

export function readPointer(buffer: Buffer, offset = 0, size = pointerSize): bigint {
  if (size === 8)
    return littleEndian ? buffer.readBigUInt64LE(offset) : buffer.readBigUInt64BE(offset);
  return BigInt(littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset));
}

function writePointer(buffer: Buffer, value: bigint, offset: number): void {
  if (pointerSize === 8) {
    if (littleEndian) buffer.writeBigUInt64LE(value, offset);
    else buffer.writeBigUInt64BE(value, offset);
  } else if (littleEndian) buffer.writeUInt32LE(Number(value), offset);
  else buffer.writeUInt32BE(Number(value), offset);
}

export function libraryPath(): string {
  const name =
    process.platform === "win32"
      ? "nfd.dll"
      : `libnfd.${process.platform === "darwin" ? "dylib" : "so"}`;
  return (
    process.env.NFD_LIBRARY_PATH ||
    fileURLToPath(new URL(`../lib/${process.platform}-${process.arch}/${name}`, import.meta.url))
  );
}

type Dialog = (version: bigint | number, output: Buffer, args: Buffer) => number;
export interface Functions {
  NFD_Init(): number;
  NFD_Quit(): void;
  NFD_GetError(): bigint | number | null;
  NFD_ClearError(): void;
  NFD_OpenDialogU8_With_Impl: Dialog;
  NFD_OpenDialogMultipleU8_With_Impl: Dialog;
  NFD_SaveDialogU8_With_Impl: Dialog;
  NFD_PickFolderU8_With_Impl: Dialog;
  NFD_PickFolderMultipleU8_With_Impl: Dialog;
  NFD_FreePathU8(path: bigint): void;
  NFD_PathSet_GetCount(paths: bigint, count: Buffer): number;
  NFD_PathSet_GetPathU8(paths: bigint, index: bigint | number, output: Buffer): number;
  NFD_PathSet_FreePathU8(path: bigint): void;
  NFD_PathSet_Free(paths: bigint): void;
}

function mainThread(): void {
  if (!isMainThread) throw new Error("Native File Dialog must run on the main thread");
}

type Kind = "open" | "multiple" | "save" | "folder" | "folders";

export function createApi(
  load: () => Functions,
  address: (buffer: Buffer) => bigint,
  readString: (pointer: bigint) => string | null,
) {
  let library: Functions | undefined;
  let initialized = false;
  function native(): Functions {
    mainThread();
    return (library ??= load());
  }
  function getError(): string | null {
    const error = native().NFD_GetError();
    return error ? readString(BigInt(error)) : null;
  }
  function check(status: number): void {
    if (status !== 1) throw new Error(getError() || "Native File Dialog failed");
  }
  function path(output: Buffer): string {
    const value = readString(readPointer(output));
    if (value === null) throw new Error("Native File Dialog returned no path");
    return value;
  }

  function run(kind: Kind, options: SaveDialogOptions): string | string[] | null {
    const f = native();
    if (!initialized) throw new Error("Call init() before opening a dialog");
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new TypeError("options must be an object");
    const folder = kind === "folder" || kind === "folders";
    const buffers: Buffer[] = [];
    function string(value: unknown, name: string): bigint {
      if (value === undefined) return 0n;
      if (typeof value !== "string" || value.includes("\0") || !value.isWellFormed())
        throw new TypeError(`${name} must be a well-formed string without NUL characters`);
      const buffer = Buffer.from(value + "\0");
      buffers.push(buffer);
      return address(buffer);
    }
    const args = Buffer.alloc((folder ? 6 : kind === "save" ? 9 : 8) * pointerSize);
    let slot = 0;
    const put = (value: bigint) => writePointer(args, value, slot++ * pointerSize);
    if (!folder) {
      const filters = options.filterList ?? [];
      if (!Array.isArray(filters)) throw new TypeError("filterList must be an array");
      const table = Buffer.alloc(filters.length * 2 * pointerSize);
      for (const [i, item] of filters.entries()) {
        if (
          !item ||
          typeof item.name !== "string" ||
          typeof item.spec !== "string" ||
          !/^[a-zA-Z0-9_+-]+(?:,[a-zA-Z0-9_+-]+)*$/.test(item.spec)
        )
          throw new TypeError("Each filter needs a name and comma-separated extensions in spec");
        writePointer(table, string(item.name, "filter name"), i * 2 * pointerSize);
        writePointer(table, string(item.spec, "filter spec"), (i * 2 + 1) * pointerSize);
      }
      buffers.push(table);
      put(filters.length ? address(table) : 0n);
      // nfdfiltersize_t is uint32; the next pointer is naturally aligned.
      if (littleEndian) args.writeUInt32LE(filters.length, slot * pointerSize);
      else args.writeUInt32BE(filters.length, slot * pointerSize);
      slot++;
    }
    put(string(options.defaultPath, "defaultPath"));
    if (kind === "save") put(string(options.defaultName, "defaultName"));
    const parent = options.parentWindow;
    const types = { windows: 1, cocoa: 2, x11: 3, wayland: 4 } as const;
    if (
      parent !== undefined &&
      (!parent ||
        !Object.hasOwn(types, parent.type) ||
        typeof parent.handle !== "bigint" ||
        parent.handle <= 0n ||
        parent.handle >= 1n << BigInt(pointerSize * 8))
    )
      throw new TypeError(
        "parentWindow needs a valid type and a positive pointer-sized bigint handle",
      );
    put(parent ? BigInt(types[parent.type]) : 0n);
    put(parent?.handle ?? 0n);
    put(string(options.title, "title"));
    put(string(options.acceptLabel, "acceptLabel"));
    put(string(options.cancelLabel, "cancelLabel"));
    const dialogs = {
      open: f.NFD_OpenDialogU8_With_Impl,
      multiple: f.NFD_OpenDialogMultipleU8_With_Impl,
      save: f.NFD_SaveDialogU8_With_Impl,
      folder: f.NFD_PickFolderU8_With_Impl,
      folders: f.NFD_PickFolderMultipleU8_With_Impl,
    };
    const output = Buffer.alloc(pointerSize);
    let result = 0;
    try {
      result = dialogs[kind](pointerSize === 8 ? 2n : 2, output, args);
      if (result === 2) return null;
      check(result);
      if (kind !== "multiple" && kind !== "folders") return path(output);
      const paths = readPointer(output);
      if (!paths) throw new Error("Native File Dialog returned no path set");
      const countBuffer = Buffer.alloc(pathSetSize);
      check(f.NFD_PathSet_GetCount(paths, countBuffer));
      const count = Number(readPointer(countBuffer, 0, pathSetSize));
      if (!Number.isSafeInteger(count) || count > 0xffffffff)
        throw new Error("Native File Dialog returned an invalid path count");
      return Array.from({ length: count }, (_, i) => {
        const item = Buffer.alloc(pointerSize);
        try {
          check(f.NFD_PathSet_GetPathU8(paths, pathSetSize === 8 ? BigInt(i) : i, item));
          return path(item);
        } finally {
          const pointer = readPointer(item);
          if (pointer) f.NFD_PathSet_FreePathU8(pointer);
        }
      });
    } finally {
      const pointer = readPointer(output);
      if (result === 1 && pointer) {
        if (kind === "multiple" || kind === "folders") f.NFD_PathSet_Free(pointer);
        else f.NFD_FreePathU8(pointer);
      }
      // Keep the strings and filter table alive throughout the synchronous native call.
      buffers.length = 0;
    }
  }

  return {
    init(): void {
      const f = native();
      if (!initialized) {
        check(f.NFD_Init());
        initialized = true;
      }
    },
    quit(): void {
      mainThread();
      if (initialized) {
        native().NFD_Quit();
        initialized = false;
      }
    },
    getError,
    clearError(): void {
      native().NFD_ClearError();
    },
    openDialog(options: DialogOptions = {}): string | null {
      return run("open", options) as string | null;
    },
    openDialogMultiple(options: DialogOptions = {}): string[] | null {
      return run("multiple", options) as string[] | null;
    },
    saveDialog(options: SaveDialogOptions = {}): string | null {
      return run("save", options) as string | null;
    },
    pickFolder(options: FolderOptions = {}): string | null {
      return run("folder", options) as string | null;
    },
    pickFolderMultiple(options: FolderOptions = {}): string[] | null {
      return run("folders", options) as string[] | null;
    },
  };
}
