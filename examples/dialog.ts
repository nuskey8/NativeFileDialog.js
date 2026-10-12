import {
  openDialog,
  openDialogMultiple,
  saveDialog,
  pickFolder,
  pickFolderMultiple,
} from "../src/index.ts";

const dialogs = {
  open: openDialog,
  multiple: openDialogMultiple,
  save: saveDialog,
  folder: pickFolder,
  folders: pickFolderMultiple,
};

const name = process.argv[2] || "open";
if (!Object.hasOwn(dialogs, name))
  throw new Error("Choose open, multiple, save, folder, or folders");

console.log(`Opening ${name} dialog…`);
const result = await dialogs[name as keyof typeof dialogs]({ defaultPath: process.cwd() });
console.log(result === null ? "Cancelled" : result);
