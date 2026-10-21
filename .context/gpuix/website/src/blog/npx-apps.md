---
title: "npx is the new app store: ship native desktop apps as npm packages with GPUIX"
description: with gpuix a native GPU desktop app is a few JS files on npm. run it with npx, update it with @latest, pass it arguments like a CLI, and let agents patch it.
---

# npx is the new app store: ship native desktop apps as npm packages with GPUIX

shipping a desktop app is still a surprisingly painful thing to do. you have to build a binary for every OS, sign it, notarize it, host the downloads somewhere, and then figure out an update story, because once the app is on someone's machine it stays on whatever version they happened to download months ago.

the result is that apps are slow to publish, slow to download and hard to keep updated, and most small tools never get made as apps at all. they stay CLIs or websites, because those are the two things that are actually easy to ship.

I think there is a much simpler way to do this, and it has been sitting in front of us the whole time: npm already solves distribution, versioning and updates for millions of packages. if an app were just a package, you would get all of that for free.

## run an app with one command

this is what gpuix makes possible. a gpuix app is a few TypeScript files that render React to the GPU through GPUI, the UI framework behind the Zed editor. there is no Electron and no webview, and the native part comes prebuilt from npm, so the app itself is only JavaScript.

that means you publish it like any other package, and people open it like any other CLI:

```bash
# open the app
npx disktree

# update it, same as any package
npx disktree@latest
```

disktree runs its TypeScript directly with Bun, so it needs Bun installed, and `bunx disktree` works the same way. gpuix itself also runs on Node 18+.

there is no installer, no dmg to drag into Applications, and no auto-updater to write. `@latest` is the update mechanism, and npm versions are the release channel.

## you never compile for each OS

the usual reason apps are painful is the build matrix. every platform needs its own binary, and every JS change means building and uploading all of them again.

with gpuix the only native code is `@gpuix/native`, and that is compiled once per release by the gpuix CI and published as prebuilt platform packages for macOS arm64, Linux x64 and Windows x64. npm picks the right one at install time. your app never touches a compiler, so shipping a change is `npm publish` and nothing else.

## almost instant to download and start

the app code is tiny. the whole `disktree` package is 79 KB unpacked. most of the download is the shared native binary, which is about 24 MB unpacked and under 10 MB as the gzipped tarball npm fetches.

that is smaller than a lot of websites, and after the first run it is cached, so opening the app again feels about as fast as loading a page.

## an app that takes arguments

running apps this way has a benefit I did not expect: the app is a CLI, so it gets argv, flags, env and cwd for free.

when I built disktree, a GPU treemap of what fills your disk, I made the folder a normal positional argument. the whole entry file is basically this:

```tsx
import path from 'node:path'
import { render } from '@gpuix/react'
import { DisktreeApp, createDisktreeStore } from './app.tsx'

const root = path.resolve(process.argv[2] ?? process.cwd())
const store = createDisktreeStore(root)
void store.rescan()

render(<DisktreeApp store={store} />, { title: 'disktree', width: 1320, height: 840 })
```

and that makes it work the way you would expect a terminal tool to work:

```bash
npx disktree              # scan the current directory
npx disktree ~/Downloads  # scan a specific folder
npx disktree /            # scan the whole disk
```

compare this with a typical desktop app, where you open it and then click through a folder picker every single time. here you are already in the folder in your terminal, so you just run the app there. adding a feature like this took one line, because `process.argv` was already there.

## agents can run it, drive it, and patch it

this is the part I care most about. because the app is just a package of JavaScript files, an AI agent can download it, run it and configure it with the same tools it already uses for everything else.

gpuix also ships a playwright-like automation API, so an agent can drive a real app window. mark elements with `testId`, then launch the app as a child process:

```ts
import { launch } from '@gpuix/react/automation'

const app = await launch({
  command: 'npx',
  args: ['disktree', `${process.env.HOME}/Downloads`],
  env: { GPUIX_BACKGROUND: '1' },
})
await app.getByTestId('tile-0').click()
await app.screenshot({ path: 'downloads.png' })
await app.close()
```

`GPUIX_BACKGROUND=1` opens the window without stealing focus, so the agent can click around and take screenshots while you keep typing in your editor. clicks and screenshots never need the window to be active.

and if the app is missing a feature or has a bug, the agent does not need to find the repo, set up a toolchain and rebuild anything. the source is right there in `node_modules`, it can edit the file and run it again immediately.

## hot reload without cloning anything

the same thing makes hot reloading work out of the box, even for an app you did not write. install it in any folder and run the entry file with `bun --hot`:

```bash
mkdir play && cd play
npm install disktree
bun --hot node_modules/disktree/src/cli.tsx ~/Downloads
```

now every save remounts the React tree on the same window, in about the time it takes to switch tabs. there is no compile step and you never cloned the original repository. disktree even keeps its scan result on `globalThis`, so a save redraws the finished tree instead of scanning the disk again.

## and everything else you get from gpuix

- it paints with Metal, Vulkan or Direct3D through GPUI, so it is faster and lighter than an equivalent Electron app, which ships a whole Chromium with every app
- you write it in React or Solid, with components, hooks and TypeScript, so everything you and your agent already know applies
- you can use any npm package and any Node API, like `node:fs` and worker threads, which is exactly what disktree does to scan a full disk
- the same automation API works in tests, on a GPU-backed test renderer, so the agent that writes a feature can also verify it with real screenshots

desktop apps got hard to ship because we treated them as a different kind of software. with gpuix they are just packages, and publishing one is `npm publish`.

𝚗𝚙𝚡 𝚍𝚒𝚜𝚔𝚝𝚛𝚎𝚎

https://github.com/remorses/gpuix
