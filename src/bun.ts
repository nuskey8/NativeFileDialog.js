import { dlopen, CString, ptr } from "bun:ffi";
import { createApi, libraryPath, pointerSize, pathSetSize } from "./common.ts";
import type { Functions } from "./common.ts";

function readString(pointer: bigint): string | null {
  if (!pointer) return null;
  const address = Number(pointer);
  if (!Number.isSafeInteger(address))
    throw new RangeError("Pointer exceeds Bun FFI safe integer range");
  return String(new CString(address as ConstructorParameters<typeof CString>[0]));
}

function load() {
  const size = pointerSize === 8 ? "u64" : "u32";
  const count = pathSetSize === 8 ? "u64" : "u32";
  const dialog = { args: [size, "ptr", "ptr"], returns: "i32" } as const;
  return dlopen(libraryPath(), {
    NFD_Init: { args: [], returns: "i32" },
    NFD_Quit: { args: [], returns: "void" },
    NFD_GetError: { args: [], returns: "ptr" },
    NFD_ClearError: { args: [], returns: "void" },
    NFD_OpenDialogU8_With_Impl: dialog,
    NFD_OpenDialogMultipleU8_With_Impl: dialog,
    NFD_SaveDialogU8_With_Impl: dialog,
    NFD_PickFolderU8_With_Impl: dialog,
    NFD_PickFolderMultipleU8_With_Impl: dialog,
    NFD_FreePathU8: { args: ["ptr"], returns: "void" },
    NFD_PathSet_GetCount: { args: ["ptr", "ptr"], returns: "i32" },
    NFD_PathSet_GetPathU8: { args: ["ptr", count, "ptr"], returns: "i32" },
    NFD_PathSet_FreePathU8: { args: ["ptr"], returns: "void" },
    NFD_PathSet_Free: { args: ["ptr"], returns: "void" },
  });
}

let library: ReturnType<typeof load> | undefined;
export const api = createApi(
  () => {
    try {
      library = load();
    } catch (cause) {
      throw new Error(
        `Cannot load nativefiledialog-extended from ${libraryPath()}. Run vp run build:native first.`,
        { cause },
      );
    }
    return library.symbols as unknown as Functions;
  },
  (buffer) => BigInt(ptr(buffer)),
  readString,
);
