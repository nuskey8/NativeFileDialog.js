import { dlopen, getRawPointer, toString } from "node:ffi";
import { createApi, libraryPath, pointerSize, pathSetSize } from "./common.ts";
import type { Functions } from "./common.ts";

let library: ReturnType<typeof dlopen> | undefined;
function load(): Functions {
  const path = libraryPath();
  const size = pointerSize === 8 ? "uint64" : "uint32";
  const count = pathSetSize === 8 ? "uint64" : "uint32";
  const dialog = { arguments: [size, "pointer", "pointer"], return: "int32" } as const;
  try {
    library = dlopen(path, {
      NFD_Init: { arguments: [], return: "int32" },
      NFD_Quit: { arguments: [], return: "void" },
      NFD_GetError: { arguments: [], return: "pointer" },
      NFD_ClearError: { arguments: [], return: "void" },
      NFD_OpenDialogU8_With_Impl: dialog,
      NFD_OpenDialogMultipleU8_With_Impl: dialog,
      NFD_SaveDialogU8_With_Impl: dialog,
      NFD_PickFolderU8_With_Impl: dialog,
      NFD_PickFolderMultipleU8_With_Impl: dialog,
      NFD_FreePathU8: { arguments: ["pointer"], return: "void" },
      NFD_PathSet_GetCount: { arguments: ["pointer", "pointer"], return: "int32" },
      NFD_PathSet_GetPathU8: { arguments: ["pointer", count, "pointer"], return: "int32" },
      NFD_PathSet_FreePathU8: { arguments: ["pointer"], return: "void" },
      NFD_PathSet_Free: { arguments: ["pointer"], return: "void" },
    });
  } catch (cause) {
    throw new Error(
      `Cannot load nativefiledialog-extended from ${path}. Run vp run build:native first.`,
      { cause },
    );
  }
  return library.functions as unknown as Functions;
}

export const api = createApi(load, getRawPointer, toString);
