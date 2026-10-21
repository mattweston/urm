/**
 * Build script for server app using esbuild CLI.
 *
 * Workspace packages use `.ts` imports and path mappings that tsc cannot
 * emit for (allowImportingTsExtensions requires noEmit). esbuild handles
 * both natively.
 */
import { execSync } from "node:child_process"

execSync(
    "npx esbuild src/main.ts --bundle --platform=node --target=node22 " +
        "--outfile=dist/main.js --format=esm --sourcemap " +
        "--tsconfig=tsconfig.json --external:dotenv --external:effect --external:@effect/* " +
        "--external:vite --external:@tailwindcss/vite",
    { stdio: "inherit" }
)

console.log("Build complete: dist/main.js")
