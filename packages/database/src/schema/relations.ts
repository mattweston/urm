import { defineRelations } from "drizzle-orm"
import * as schema from "./index.ts"

export const relations = defineRelations(schema, (r) => ({
    members: {
        domain: r.one.domains({
            from: r.members.domain_id,
            to: r.domains.id,
            optional: false,
        }),
    },
    users: {
        personal_organization: r.one.organizations({
            from: r.users.personal_organization_id,
            to: r.organizations.id,
        }),
        memberships: r.many.organization_members({
            from: r.users.id,
            to: r.organization_members.user_id,
        }),
        sessions: r.many.auth_sessions({
            from: r.users.id,
            to: r.auth_sessions.user_id,
        }),
        invitations: r.many.organization_invitations({
            from: r.users.id,
            to: r.organization_invitations.invited_by_user_id,
        }),
        created_domains: r.many.domains({
            from: r.users.id,
            to: r.domains.created_by_user_id,
        }),
    },
    organizations: {
        personal_users: r.many.users({
            from: r.organizations.id,
            to: r.users.personal_organization_id,
        }),
        members: r.many.organization_members({
            from: r.organizations.id,
            to: r.organization_members.organization_id,
        }),
        invitations: r.many.organization_invitations({
            from: r.organizations.id,
            to: r.organization_invitations.organization_id,
        }),
        domains: r.many.domains({
            from: r.organizations.id,
            to: r.domains.organization_id,
        }),
    },
    organization_members: {
        organization: r.one.organizations({
            from: r.organization_members.organization_id,
            to: r.organizations.id,
            optional: false,
        }),
        user: r.one.users({
            from: r.organization_members.user_id,
            to: r.users.id,
            optional: false,
        }),
    },
    organization_invitations: {
        organization: r.one.organizations({
            from: r.organization_invitations.organization_id,
            to: r.organizations.id,
            optional: false,
        }),
        invited_by: r.one.users({
            from: r.organization_invitations.invited_by_user_id,
            to: r.users.id,
            optional: false,
        }),
    },
    auth_sessions: {
        user: r.one.users({
            from: r.auth_sessions.user_id,
            to: r.users.id,
            optional: false,
        }),
    },
    domains: {
        organization: r.one.organizations({
            from: r.domains.organization_id,
            to: r.organizations.id,
            optional: false,
        }),
        created_by: r.one.users({
            from: r.domains.created_by_user_id,
            to: r.users.id,
            optional: false,
        }),
        contacts: r.many.domain_contacts({
            from: r.domains.id,
            to: r.domain_contacts.domain_id,
        }),
    },
    contacts: {
        email_addresses: r.many.contact_email_addresses({
            from: r.contacts.id,
            to: r.contact_email_addresses.contact_id,
        }),
        domains: r.many.domain_contacts({
            from: r.contacts.id,
            to: r.domain_contacts.contact_id,
        }),
    },
    contact_email_addresses: {
        contact: r.one.contacts({
            from: r.contact_email_addresses.contact_id,
            to: r.contacts.id,
            optional: false,
        }),
    },
    domain_contacts: {
        domain: r.one.domains({
            from: r.domain_contacts.domain_id,
            to: r.domains.id,
            optional: false,
        }),
        contact: r.one.contacts({
            from: r.domain_contacts.contact_id,
            to: r.contacts.id,
            optional: false,
        }),
    },
}))
