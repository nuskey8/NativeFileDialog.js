import { defineConfig } from "vite-plus";

const ignorePatterns = ["nativefiledialog/**", "dist/**", "lib/**", "build/**", "bun.lock"];

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    deps: { neverBundle: ["node:ffi", "bun:ffi"] },
  },
  test: {},
  lint: {
    ignorePatterns,
  },
  fmt: {
    ignorePatterns,
  },
});
