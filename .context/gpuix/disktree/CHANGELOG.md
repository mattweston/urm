# disktree

## 0.2.2

1. **Run disktree inside your terminal** with `GPUIX_TERMINAL=1`, in kitty or Ghostty, on macOS or Linux. Works over `ssh -t`:

   ```bash
   GPUIX_TERMINAL=1 npx disktree ~/src
   ```

   The top bar no longer reserves space for macOS traffic lights in a terminal, so the depth controls fit.

## 0.2.1

1. **Windows support fixes** — the native Windows title bar stays, so the window can be dragged, minimized, maximized and closed. Source builds no longer need the Unix `chmod` tool.
2. **Platform file manager** — the selection panel opens Explorer on Windows, Finder on macOS and `xdg-open` on Linux, and names it on the button. On Linux, selecting a file opens its folder. Launch errors show in the panel instead of crashing.
3. **Lower memory after large scans** — a 350,000-file scan retains about 24 MiB of tree heap instead of 32 MiB.
4. **Built on `@gpuix/react` 0.11.0**.

Fixes https://github.com/remorses/gpuix/issues/74
Fixes https://github.com/remorses/gpuix/issues/75
Fixes https://github.com/remorses/gpuix/issues/76
Fixes https://github.com/remorses/gpuix/issues/77

## 0.2.0

1. **Runs on plain Node** — Bun is no longer required:

   ```bash
   npx disktree ~/src
   ```

   The package ships compiled JavaScript and needs Node 20 or later. `bunx disktree` still works.

2. **iCloud folders are scanned like any other folder** — the Bun-only check that skipped evicted iCloud folders is gone.
