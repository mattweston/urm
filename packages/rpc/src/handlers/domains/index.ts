/**
 * # Domains RPC
 */
import { Effect, type Schema } from "effect"
import {
    Domain,
    DomainHostname,
    type DomainHostnameResolution,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/domains"
import { AuthorizationError, ValidationError } from "@urm/domain/errors"

// Extract types from Effect schemas
export type DomainType = Schema.Schema.Type<typeof Domain>
export type DomainHostnameType = Schema.Schema.Type<typeof DomainHostname>
export type DomainAdminRole =
    | "owner"
    | "admin"
    | "editor"
    | "support"
    | "viewer"
export type DomainAdminType = {
    id: string
    domain_id: string
    contact_id: string
    role: DomainAdminRole
    status: "invited" | "active" | "suspended"
    created_at: Date
}

export {
    DomainsRpcs,
    DomainsAddAdminRpc,
    DomainsCreateRpc,
    DomainsCreateHostnamesRpc,
    DomainsListRpc,
    DomainsListHostnamesRpc,
    DomainsGetRpc,
    DomainsUpdateRpc,
    DomainsDeleteRpc,
    DomainsDeleteHostnameRpc,
    DomainsGetAdminRoleRpc,
    DomainsListAdminsRpc,
    DomainsProvisionHostnameCertificateRpc,
    DomainsResolveHostnameRpc,
    DomainsRemoveAdminRpc,
    DomainsUpdateAdminRoleRpc,
    DomainsVerifyHostnameDnsRpc,
} from "@urm/contracts/domains"

export { DomainsRpcLive, DomainsRpcHandlersTagLive } from "./handlers"
export { DomainsRpcHandlersTag } from "./tag.js"

export { DomainsRepository } from "@urm/contracts/repositories/domains"
export { DomainsRepositoryLive } from "./repository"

export type DomainsRpcHandlers = {
    "domains.create": ({
        data,
    }: {
        data: { name: string; slug: string }
    }) => Effect.Effect<
        { item: DomainType; txid: number },
        AuthorizationError | DatabaseError | ConflictError | ValidationError,
        never
    >
    "domains.list": () => Effect.Effect<
        DomainType[],
        AuthorizationError | DatabaseError,
        never
    >
    "domains.get": ({
        id,
    }: {
        id: string
    }) => Effect.Effect<
        DomainType,
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.update": ({
        id,
        data,
    }: {
        id: string
        data: { name: string; slug: string }
    }) => Effect.Effect<
        { item: DomainType; txid: number },
        AuthorizationError | NotFoundError | DatabaseError | ValidationError,
        never
    >
    "domains.delete": ({
        id,
    }: {
        id: string
    }) => Effect.Effect<
        { success: boolean },
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.add_admin": ({
        domain_id,
        contact_id,
        role,
    }: {
        domain_id: string
        contact_id: string
        role: DomainAdminRole
    }) => Effect.Effect<
        DomainAdminType,
        AuthorizationError | DatabaseError | ConflictError,
        never
    >
    "domains.list_admins": ({
        domain_id,
    }: {
        domain_id: string
    }) => Effect.Effect<
        DomainAdminType[],
        AuthorizationError | DatabaseError,
        never
    >
    "domains.update_admin_role": ({
        domain_id,
        contact_id,
        new_role,
    }: {
        domain_id: string
        contact_id: string
        new_role: DomainAdminRole
    }) => Effect.Effect<
        DomainAdminType,
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.remove_admin": ({
        domain_id,
        contact_id,
    }: {
        domain_id: string
        contact_id: string
    }) => Effect.Effect<
        { success: boolean },
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.get_admin_role": ({
        domain_id,
    }: {
        domain_id: string
    }) => Effect.Effect<
        { role: DomainAdminRole; domain_id: string },
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.hostnames.create": ({
        data,
    }: {
        data: { domain_id: string; hostname: string }
    }) => Effect.Effect<
        DomainHostnameType[],
        | AuthorizationError
        | NotFoundError
        | DatabaseError
        | ConflictError
        | ValidationError,
        never
    >
    "domains.hostnames.list": () => Effect.Effect<
        DomainHostnameType[],
        AuthorizationError | DatabaseError,
        never
    >
    "domains.hostnames.delete": ({
        id,
    }: {
        id: string
    }) => Effect.Effect<
        { success: boolean },
        AuthorizationError | NotFoundError | DatabaseError,
        never
    >
    "domains.hostnames.verify_dns": ({
        id,
    }: {
        id: string
    }) => Effect.Effect<
        { hostnames: DomainHostnameType[] },
        AuthorizationError | NotFoundError | DatabaseError | ValidationError,
        never
    >
    "domains.hostnames.provision_certificate": ({
        id,
    }: {
        id: string
    }) => Effect.Effect<
        { hostnames: DomainHostnameType[] },
        AuthorizationError | NotFoundError | DatabaseError | ValidationError,
        never
    >
    "domains.hostnames.resolve": ({
        hostname,
    }: {
        hostname: string
    }) => Effect.Effect<DomainHostnameResolution, DatabaseError, never>
}
