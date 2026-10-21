/\*\*

- Platform layer for Effect Platform services.
-
- This module provides platform abstractions for Bun runtime, including FileSystem,
- Process, Path, and other platform-specific services required by Effect-based
- applications.
-
- The Effect Platform provides cross-platform abstractions for common
- operations like file I/O, process management, and path manipulation. This module
- configures these services to use Bun's native implementations.
-
- :::note[Runtime-Specific]
- This module is specifically configured for Bun. For other runtimes (Node.js, Deno),
- you would use the corresponding platform context layer.
- :::
-
- ## Usage
-
- Import and provide this layer to your Effect application:
-
- ```ts

  ```
- import { PlatformLive } from './platform'
-
- Effect.gen(function\* () {
-     // Your Effect code here
-     // Platform services (FileSystem, Process, etc.) are now available
- }).pipe(Effect.provide(PlatformLive))
- ```

  ```
-
- ## Available Services
-
- When this layer is provided, the following services become available:
-
-   - **FileSystem**: File and directory operations
-   - **Process**: Process management and environment variables
-   - **Path**: Path manipulation utilities
-   - **HttpClient**: HTTP client capabilities
-   - **Terminal**: Terminal/console operations
-
- :::caution[Layer Composition]
- This layer should typically be provided at the root of your application's
- dependency graph. Other layers may depend on platform services.
- :::
-
- ## Resources
-
-   - [Effect Platform Bun](https://github.com/Effect-TS/effect/tree/main/packages/platform-bun)
-   - [Platform](https://effect.website/docs/platform/introduction/)
-
- @packageDocumentation
  \*/

import { BunContext } from "@effect/platform-bun"

/\*\*

- Bun platform layer for Effect services.
-
- Provides platform-specific implementations for Effect's platform services
- using Bun's native capabilities. This layer enables FileSystem, Process,
- Path, HttpClient, and Terminal services within Effect programs.
-
- Provide this layer to your Effect program to enable platform services:
-
- ```ts

  ```
- Effect.provide(PlatformLive)
- ```

  ```
-
- Once provided, platform services can be accessed via Effect's service
- accessors (e.g., `FileSystem`, `Process`, `Path`).
-
- @example
- ```ts

  ```
- import { Effect } from "effect"
- import { FileSystem } from "@effect/platform"
- import { PlatformLive } from "./platform"
-
- const program = Effect.gen(function\* () {
-     const fs = yield* FileSystem // FileSystem service is available
-     const files = yield* fs.readDirectory("./src")
-     return files
- })
-
- const result = await Effect.runPromise(
-     program.pipe(Effect.provide(PlatformLive))
- )
- ```
   */
  export const PlatformLive = BunContext.layer
  ```
