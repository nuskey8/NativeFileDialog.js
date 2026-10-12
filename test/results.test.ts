import { expect, it, vi } from "vite-plus/test";

const transport = vi.hoisted(() => ({
  callback: undefined as
    | ((error: Error | null, stdout: string, stderr: string) => void)
    | undefined,
  end: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: vi.fn((_executable, _args, _options, callback) => {
    transport.callback = callback;
    return { stdin: { on: vi.fn(), end: transport.end } };
  }),
}));
const { openDialog, openDialogMultiple } = await import("../src/index.ts");

it("waits for child completion and preserves cancellation and Unicode paths", async () => {
  for (const result of [null, "/tmp/日本語.txt"]) {
    let settled = false;
    const pending = openDialog({ title: "選択" }).then((value) => {
      settled = true;
      return value;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(JSON.parse(transport.end.mock.lastCall![0])).toEqual({
      kind: "openDialog",
      options: { title: "選択" },
    });
    transport.callback!(null, JSON.stringify({ result }), "");
    expect(await pending).toEqual(result);
  }
  const pending = openDialogMultiple();
  transport.callback!(null, JSON.stringify({ result: ["/tmp/a", "/tmp/b"] }), "");
  expect(await pending).toEqual(["/tmp/a", "/tmp/b"]);
});

it("rejects crashes and malformed child responses", async () => {
  const crashed = openDialog();
  transport.callback!(new Error("signal SIGABRT"), "", "native failure");
  await expect(crashed).rejects.toThrow("native failure");
  for (const output of ["invalid json", '{"result":42}', '{"error":"NFD failed"}']) {
    const pending = openDialog();
    transport.callback!(null, output, "");
    await expect(pending).rejects.toThrow();
  }
});
