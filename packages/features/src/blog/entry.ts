/**
 * # Blog feature entry
 *
 * Client-side Foldkit app for the blog list and article reading views.
 * Dynamically imported by `apps/web/src/pages/blog/urm/[...slug].astro`
 * and mounted on `#foldkit-root`; owns all routes under `/blog/urm/`.
 * Talks to the server only through the RPC contracts in `@urm/contracts`.
 */
import { bootstrap } from "./main.ts"

bootstrap()
