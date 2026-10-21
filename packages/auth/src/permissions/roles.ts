/**
 * # Roles
 *
 * Twelve roles on one numeric hierarchy; every check is `>=` on the level.
 */
/*
TODO:

Database roles for sysadmin / admins / members / visitors

*/

import * as Schema from "effect/Schema"

export const Role = Schema.Literals([
    "member",
    "visitor",
    "customer",
    "trustee",
    "volunteer",
    "staff",
    "viewer",
    "support",
    "editor",
    "admin",
    "owner",
    "sysadmin",
])

// Duplicated ?
export type Role = typeof Role.Type

// INTERNAL ?
// Levels are shared, so this is not a total order: visitor/customer are both 1,
// and member/volunteer/staff are all 2. Since hasRoleOrHigher compares with >=,
// peer roles satisfy each other in both directions. Two roles that must stay
// distinct cannot share a level.
export const ROLE_HIERARCHY: Record<Role, number> = {
    visitor: 1,
    customer: 1,
    member: 2,
    volunteer: 2,
    staff: 2,
    trustee: 3,
    viewer: 4,
    support: 5,
    editor: 6,
    admin: 7,
    owner: 8,
    sysadmin: 9,
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
    visitor: "Public visitor relationship",
    customer: "Customer relationship",
    member: "Member relationship",
    volunteer: "Volunteer relationship",
    staff: "Staff relationship",
    trustee: "Trustee relationship",
    viewer: "Read-only domain admin access",
    support: "Support domain admin access",
    editor: "Content editing domain admin access",
    admin: "Domain admin access",
    owner: "Domain owner access",
    sysadmin: "Platform-wide admin access",
}

export const hasRoleOrHigher = (actual: Role, required: Role): boolean => {
    return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required]
}

export const getRolesWithPrivilege = (required: Role): Role[] => {
    const minLevel = ROLE_HIERARCHY[required]
    return Object.entries(ROLE_HIERARCHY)
        .filter(([, level]) => level >= minLevel)
        .map(([role]) => role as Role)
}

export const getRoleLevel = (role: Role): number => {
    return ROLE_HIERARCHY[role]
}
