/**
 * # HTTP Middleware
 *
 * HttpApiMiddleware tags for request-scoped services.
 *
 * Not applied anywhere: nothing in packages/ or apps/ imports either
 * middleware. The database layer that runs is @urm/db's, provided directly as
 * a Layer.
 *
 * Note this barrel re-exports the middleware classes and their errors but not
 * the context services they provide, so a consumer cannot name the PgDrizzle
 * that DatabaseMiddleware supplies.
 */

export {
    CloudflareBindingsError,
    CloudflareBindingsMiddleware,
} from "./cloudflare.ts"

export { DatabaseConnectionError, DatabaseMiddleware } from "./database.ts"
