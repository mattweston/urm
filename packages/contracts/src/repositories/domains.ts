/**
 * # Domains Repository Contract
 *
 * Persistence failures use the shared tagged DatabaseError so callers can
 * narrow the Effect failure channel.
 */

import { Context, Effect, Schema } from "effect"
import type { ItemResult } from "../repository.ts"
import {
    Domain,
    DomainHostname,
    DomainHostnameResolution,
    CreateDomainInput,
    CreateDomainHostnameInput,
} from "@urm/domain/schemas/domains"
import {
    AuthorizationError,
    ConflictError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"

export interface DomainAdminWithInfo {
    id: string
    domain_id: string
    contact_id: string
    role: "owner" | "admin" | "editor" | "support" | "viewer"
    status: "invited" | "active" | "suspended"
    created_at: Date
}

export interface DomainsRepositoryType {
    // Domain operations
    insert(
        data: Schema.Schema.Type<typeof CreateDomainInput> & {
            org_id: string
            created_by_contact_id: string
        }
    ): Effect.Effect<ItemResult<Domain>, ValidationError | DatabaseError, never>
    createForOrganisationOwner(
        active_domain_id: string,
        contact_id: string,
        data: Schema.Schema.Type<typeof CreateDomainInput>
    ): Effect.Effect<
        ItemResult<Domain>,
        AuthorizationError | ConflictError | ValidationError | DatabaseError,
        never
    >
    findById(id: string): Effect.Effect<Domain | null, DatabaseError, never>
    findByContactId(
        contactId: string
    ): Effect.Effect<Domain[], DatabaseError, never>
    update(
        id: string,
        data: { name: string }
    ): Effect.Effect<ItemResult<Domain>, DatabaseError, never>
    softDelete(id: string): Effect.Effect<void, DatabaseError, never>

    // Domain admin operations
    addAdmin(
        domainId: string,
        contactId: string,
        role: "owner" | "admin" | "editor" | "support" | "viewer"
    ): Effect.Effect<DomainAdminWithInfo, DatabaseError, never>
    findAdmins(
        domainId: string
    ): Effect.Effect<DomainAdminWithInfo[], DatabaseError, never>
    updateAdminRole(
        domainId: string,
        contactId: string,
        role: "owner" | "admin" | "editor" | "support" | "viewer"
    ): Effect.Effect<DomainAdminWithInfo, DatabaseError, never>
    removeAdmin(
        domainId: string,
        contactId: string
    ): Effect.Effect<void, DatabaseError, never>
    findAdmin(
        domainId: string,
        contactId: string
    ): Effect.Effect<DomainAdminWithInfo | null, DatabaseError, never>

    // Domain hostname operations
    createHostnames(
        data: Schema.Schema.Type<typeof CreateDomainHostnameInput>
    ): Effect.Effect<DomainHostname[], DatabaseError, never>
    findHostnamesByContactId(
        contactId: string
    ): Effect.Effect<DomainHostname[], DatabaseError, never>
    findHostnameByIdForContact(
        id: string,
        contactId: string
    ): Effect.Effect<DomainHostname | null, DatabaseError, never>
    markApexVerified(
        domainId: string,
        apexHostname: string
    ): Effect.Effect<DomainHostname[], DatabaseError, never>
    markApexCertificateActive(
        domainId: string,
        apexHostname: string
    ): Effect.Effect<DomainHostname[], DatabaseError, never>
    resolveHostname(
        hostname: string
    ): Effect.Effect<DomainHostnameResolution, DatabaseError, never>
    softDeleteHostnameForContact(
        id: string,
        contactId: string
    ): Effect.Effect<void, DatabaseError, never>
}

export class DomainsRepository extends Context.Service<
    DomainsRepository,
    DomainsRepositoryType
>()("DomainsRepository") {}
