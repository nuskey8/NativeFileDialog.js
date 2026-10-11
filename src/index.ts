const backend = await (process.versions.bun ? import("./bun.ts") : import("./node.ts"));

export type {
  FilterItem,
  WindowHandle,
  FolderOptions,
  DialogOptions,
  SaveDialogOptions,
} from "./common.ts";
export const {
  init,
  quit,
  getError,
  clearError,
  openDialog,
  openDialogMultiple,
  saveDialog,
  pickFolder,
  pickFolderMultiple,
} = backend.api;
