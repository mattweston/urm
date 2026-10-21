#!/usr/bin/env tsx
/**
 * Reset Demo Database Script
 *
 * Legacy global demo-data utility.
 *
 * Do not use this for per-contact demo workspaces. Use
 * `demo-workspace-lifecycle.ts` instead; it expires, resets, and purges one
 * disposable workspace at a time with explicit confirmations.
 *
 * This command intentionally exits with an error. Use:
 *
 *   pnpm --filter @urm/db demo:workspaces -- expire
 *   pnpm --filter @urm/db demo:workspaces -- reset <contact-id> --confirm-reset=<contact-id>
 *   pnpm --filter @urm/db demo:workspaces -- purge --confirm-purge
 */

console.error(
    "reset-demo-db.ts is retired because it clears shared demo data. Use demo:workspaces instead."
)
process.exit(1)
