import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"
import {
    Domain,
    DomainHostname,
    DomainHostnameResolution,
    CreateDomainInput,
    CreateDomainHostnameInput,
    NotFoundError,
    DatabaseError,
    ConflictError,
} from "@urm/domain/schemas/domains"
import { AuthorizationError, ValidationError } from "@urm/domain/errors"
import { AuthenticatedRpcMiddleware } from "../auth-legacy/rpc-middleware.ts"

const DomainAdminRole = Schema.Literals([
    "owner",
    "admin",
    "editor",
    "support",
    "viewer",
])
const DomainAdminStatus = Schema.Literals(["invited", "active", "suspended"])

const DomainAdmin = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    contact_id: Schema.String,
    role: DomainAdminRole,
    status: DomainAdminStatus,
    created_at: Schema.Date,
})

export const DomainsCreateRpc = Rpc.make("domains.create", {
    payload: Schema.Struct({
        data: CreateDomainInput,
    }),
    success: Schema.Struct({
        item: Domain,
        txid: Schema.Number,
    }),
    error: Schema.Union([
        AuthorizationError,
        DatabaseError,
        ConflictError,
        ValidationError,
    ]),
})

export const DomainsListRpc = Rpc.make("domains.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(Domain),
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const DomainsGetRpc = Rpc.make("domains.get", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Domain,
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsUpdateRpc = Rpc.make("domains.update", {
    payload: Schema.Struct({
        id: Schema.String,
        data: Schema.Struct({
            name: Schema.String,
        }),
    }),
    success: Schema.Struct({
        item: Domain,
        txid: Schema.Number,
    }),
    error: Schema.Union([
        AuthorizationError,
        NotFoundError,
        DatabaseError,
        ValidationError,
    ]),
})

export const DomainsDeleteRpc = Rpc.make("domains.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        success: Schema.Boolean,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsAddAdminRpc = Rpc.make("domains.add_admin", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        contact_id: Schema.String,
        role: DomainAdminRole,
    }),
    success: DomainAdmin,
    error: Schema.Union([AuthorizationError, DatabaseError, ConflictError]),
})

export const DomainsListAdminsRpc = Rpc.make("domains.list_admins", {
    payload: Schema.Struct({
        domain_id: Schema.String,
    }),
    success: Schema.Array(DomainAdmin),
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const DomainsUpdateAdminRoleRpc = Rpc.make("domains.update_admin_role", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        contact_id: Schema.String,
        new_role: DomainAdminRole,
    }),
    success: DomainAdmin,
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsRemoveAdminRpc = Rpc.make("domains.remove_admin", {
    payload: Schema.Struct({
        domain_id: Schema.String,
        contact_id: Schema.String,
    }),
    success: Schema.Struct({
        success: Schema.Boolean,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsGetAdminRoleRpc = Rpc.make("domains.get_admin_role", {
    payload: Schema.Struct({
        domain_id: Schema.String,
    }),
    success: Schema.Struct({
        role: DomainAdminRole,
        domain_id: Schema.String,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsCreateHostnamesRpc = Rpc.make("domains.hostnames.create", {
    payload: Schema.Struct({
        data: CreateDomainHostnameInput,
    }),
    success: Schema.Array(DomainHostname),
    error: Schema.Union([
        AuthorizationError,
        NotFoundError,
        DatabaseError,
        ConflictError,
        ValidationError,
    ]),
})

export const DomainsListHostnamesRpc = Rpc.make("domains.hostnames.list", {
    payload: Schema.Struct({}),
    success: Schema.Array(DomainHostname),
    error: Schema.Union([AuthorizationError, DatabaseError]),
})

export const DomainsDeleteHostnameRpc = Rpc.make("domains.hostnames.delete", {
    payload: Schema.Struct({
        id: Schema.String,
    }),
    success: Schema.Struct({
        success: Schema.Boolean,
    }),
    error: Schema.Union([AuthorizationError, NotFoundError, DatabaseError]),
})

export const DomainsVerifyHostnameDnsRpc = Rpc.make(
    "domains.hostnames.verify_dns",
    {
        payload: Schema.Struct({
            id: Schema.String,
        }),
        success: Schema.Struct({
            hostnames: Schema.Array(DomainHostname),
        }),
        error: Schema.Union([
            AuthorizationError,
            NotFoundError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const DomainsProvisionHostnameCertificateRpc = Rpc.make(
    "domains.hostnames.provision_certificate",
    {
        payload: Schema.Struct({
            id: Schema.String,
        }),
        success: Schema.Struct({
            hostnames: Schema.Array(DomainHostname),
        }),
        error: Schema.Union([
            AuthorizationError,
            NotFoundError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const DomainsResolveHostnameRpc = Rpc.make("domains.hostnames.resolve", {
    payload: Schema.Struct({
        hostname: Schema.String,
    }),
    success: DomainHostnameResolution,
    error: DatabaseError,
})

export const DomainsRpcs = RpcGroup.make(
    DomainsCreateRpc,
    DomainsListRpc,
    DomainsGetRpc,
    DomainsUpdateRpc,
    DomainsDeleteRpc,
    DomainsAddAdminRpc,
    DomainsListAdminsRpc,
    DomainsUpdateAdminRoleRpc,
    DomainsRemoveAdminRpc,
    DomainsGetAdminRoleRpc,
    DomainsCreateHostnamesRpc,
    DomainsListHostnamesRpc,
    DomainsDeleteHostnameRpc,
    DomainsVerifyHostnameDnsRpc,
    DomainsProvisionHostnameCertificateRpc,
    DomainsResolveHostnameRpc
).middleware(AuthenticatedRpcMiddleware)
