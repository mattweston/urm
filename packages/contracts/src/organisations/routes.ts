import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"

import { AuthenticatedRpcMiddleware } from "../auth-legacy/rpc-middleware.ts"
import {
    AuthorizationError,
    ConflictError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"

export const OrganisationRole = Schema.Literals(["owner", "admin", "member"])

export const OrganisationMember = Schema.Struct({
    contact_id: Schema.String,
    name: Schema.String,
    email: Schema.optional(Schema.String),
    role: OrganisationRole,
    status: Schema.Literals(["active", "suspended"]),
})

export const OrganisationsListMembersRpc = Rpc.make(
    "organisations.members.list",
    {
        payload: Schema.Struct({}),
        success: Schema.Array(OrganisationMember),
        error: Schema.Union([AuthorizationError, DatabaseError]),
    }
)

export const OrganisationsInviteMemberRpc = Rpc.make(
    "organisations.members.invite",
    {
        payload: Schema.Struct({
            email: Schema.String,
            role: Schema.Literals(["admin", "member"]),
        }),
        success: Schema.Struct({ invitation_id: Schema.String }),
        error: Schema.Union([
            AuthorizationError,
            ConflictError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const OrganisationsAcceptInvitationRpc = Rpc.make(
    "organisations.invitations.accept",
    {
        payload: Schema.Struct({ code: Schema.String }),
        success: OrganisationMember,
        error: Schema.Union([
            AuthorizationError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const OrganisationsUpdateMemberRpc = Rpc.make(
    "organisations.members.update",
    {
        payload: Schema.Struct({
            contact_id: Schema.String,
            role: Schema.Literals(["admin", "member"]),
            status: Schema.Literals(["active", "suspended"]),
        }),
        success: OrganisationMember,
        error: Schema.Union([
            AuthorizationError,
            DatabaseError,
            ValidationError,
        ]),
    }
)

export const OrganisationsRpcs = RpcGroup.make(
    OrganisationsListMembersRpc,
    OrganisationsInviteMemberRpc,
    OrganisationsAcceptInvitationRpc,
    OrganisationsUpdateMemberRpc
).middleware(AuthenticatedRpcMiddleware)
