# NativeFileDialog.js

JavaScript/TypeScript [nativefiledialog-extended](https://github.com/btzy/nativefiledialog-extended) bindings for Node.js and Bun.

## Installation

Requires Node.js 26.1+ with FFI support or Bun. Binaries target macOS 11+, Windows, and Linux (glibc 2.35+ with GTK 3), on x64 and arm64.

```sh
npm add nativefiledialog.js
# or
bun add nativefiledialog.js
```

## Usage

```ts
import {
  init,
  quit,
  openDialog,
  openDialogMultiple,
  saveDialog,
  pickFolder,
  pickFolderMultiple,
} from "nativefiledialog.js";

init();
try {
  const file = openDialog({
    filterList: [{ name: "Images", spec: "png,jpg" }],
    defaultPath: process.cwd(),
    title: "Choose an image",
  });
  const files = openDialogMultiple({ filterList: [{ name: "Text", spec: "txt" }] });
  const destination = saveDialog({ defaultName: "untitled.txt" });
  const folder = pickFolder();
  const folders = pickFolderMultiple();
} finally {
  quit();
}
```

## License

[MIT](LICENSE). nativefiledialog-extended uses the [zlib license](nativefiledialog/LICENSE).
