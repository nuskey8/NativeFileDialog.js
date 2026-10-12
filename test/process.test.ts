import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  openDialog,
  openDialogMultiple,
  pickFolder,
  pickFolderMultiple,
  saveDialog,
} from "../src/index.ts";

afterEach(() => vi.unstubAllEnvs());

it("rejects unsupported parent handles and invalid options before spawning", async () => {
  await expect(openDialog(null as never)).rejects.toThrow("options must be an object");
  await expect(openDialog({ parentWindow: {} } as never)).rejects.toThrow("parentWindow");
});

it("reports child startup failures for every dialog and survives repeated calls", async () => {
  vi.stubEnv("NFD_LIBRARY_PATH", "/nonexistent/nfd-test-library");
  for (const dialog of [
    openDialog,
    openDialogMultiple,
    saveDialog,
    pickFolder,
    pickFolderMultiple,
    openDialog,
  ]) {
    await expect(dialog()).rejects.toThrow("Cannot load nativefiledialog-extended");
  }
});
