import { describe, it, expect } from "vitest"
import {
    hasRoleOrHigher,
    ROLE_HIERARCHY,
    getRolesWithPrivilege,
    getRoleLevel,
    type Role,
} from "../src/permissions/roles.ts"

describe("@urm/permissions - Role Hierarchy", () => {
    describe("ROLE_HIERARCHY", () => {
        it("defines numeric levels for each role", () => {
            expect(ROLE_HIERARCHY.visitor).toBe(1)
            expect(ROLE_HIERARCHY.member).toBe(2)
            expect(ROLE_HIERARCHY.admin).toBe(7)
            expect(ROLE_HIERARCHY.sysadmin).toBe(9)
        })

        it("has expected roles", () => {
            const roles = Object.keys(ROLE_HIERARCHY)
            expect(roles).toContain("visitor")
            expect(roles).toContain("member")
            expect(roles).toContain("admin")
            expect(roles).toContain("sysadmin")
        })
    })

    describe("hasRoleOrHigher", () => {
        it("allows exact role match", () => {
            expect(hasRoleOrHigher("visitor", "visitor")).toBe(true)
            expect(hasRoleOrHigher("member", "member")).toBe(true)
            expect(hasRoleOrHigher("admin", "admin")).toBe(true)
        })

        it("allows higher roles to access lower privilege routes", () => {
            expect(hasRoleOrHigher("member", "visitor")).toBe(true)
            expect(hasRoleOrHigher("admin", "member")).toBe(true)
            expect(hasRoleOrHigher("sysadmin", "admin")).toBe(true)
        })

        it("denies lower roles from accessing higher privilege routes", () => {
            expect(hasRoleOrHigher("visitor", "member")).toBe(false)
            expect(hasRoleOrHigher("member", "admin")).toBe(false)
            expect(hasRoleOrHigher("member", "admin")).toBe(false)
        })

        it("enforces strict hierarchy ordering", () => {
            const roleList = [
                "visitor",
                "member",
                "trustee",
                "viewer",
                "admin",
                "sysadmin",
            ]
            const roles: Role[] = roleList as Role[]

            for (const actual of roles) {
                for (const required of roles) {
                    const canAccess = hasRoleOrHigher(actual, required)
                    const shouldAccess =
                        ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required]
                    expect(canAccess).toBe(shouldAccess)
                }
            }
        })
    })

    describe("getRolesWithPrivilege", () => {
        it("returns roles that meet or exceed privilege level", () => {
            expect(getRolesWithPrivilege("visitor")).toContain("visitor")
            expect(getRolesWithPrivilege("visitor")).toContain("member")
            expect(getRolesWithPrivilege("visitor")).toContain("admin")
        })

        it("returns elevated roles for member requirement", () => {
            const roles = getRolesWithPrivilege("member")
            expect(roles).toContain("member")
            expect(roles).toContain("admin")
            expect(roles).not.toContain("visitor")
        })

        it("returns admin and above for admin requirement", () => {
            const roles = getRolesWithPrivilege("admin")
            expect(roles).toContain("admin")
            expect(roles).toContain("owner")
            expect(roles).toContain("sysadmin")
        })

        it("returns roles in consistent order", () => {
            const firstCall = getRolesWithPrivilege("visitor")
            const secondCall = getRolesWithPrivilege("visitor")
            expect(firstCall).toEqual(secondCall)
        })
    })

    describe("getRoleLevel", () => {
        it("returns correct numeric level for each role", () => {
            expect(getRoleLevel("visitor")).toBe(1)
            expect(getRoleLevel("member")).toBe(2)
            expect(getRoleLevel("admin")).toBe(7)
        })

        it("can be used to compare roles", () => {
            expect(getRoleLevel("admin")).toBeGreaterThan(
                getRoleLevel("member")
            )
            expect(getRoleLevel("member")).toBeGreaterThan(
                getRoleLevel("visitor")
            )
            expect(getRoleLevel("admin")).toBeGreaterThan(
                getRoleLevel("visitor")
            )
        })
    })

    describe("Edge cases and consistency", () => {
        it("maintains consistency between hasRoleOrHigher and ROLE_HIERARCHY", () => {
            const roles: Role[] = ["visitor", "member", "admin", "sysadmin"]

            for (const actual of roles) {
                for (const required of roles) {
                    const result = hasRoleOrHigher(actual, required)
                    const expected =
                        ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required]
                    expect(result).toBe(expected)
                }
            }
        })

        it("is transitive (if A > B and B > C, then A > C)", () => {
            expect(hasRoleOrHigher("admin", "member")).toBe(true)
            expect(hasRoleOrHigher("member", "visitor")).toBe(true)
            expect(hasRoleOrHigher("admin", "visitor")).toBe(true)
        })

        it("is reflexive (A >= A)", () => {
            expect(hasRoleOrHigher("visitor", "visitor")).toBe(true)
            expect(hasRoleOrHigher("member", "member")).toBe(true)
            expect(hasRoleOrHigher("admin", "admin")).toBe(true)
        })

        it("is antisymmetric (if A > B, then B < A)", () => {
            expect(hasRoleOrHigher("admin", "member")).toBe(true)
            expect(hasRoleOrHigher("member", "admin")).toBe(false)

            expect(hasRoleOrHigher("member", "visitor")).toBe(true)
            expect(hasRoleOrHigher("visitor", "member")).toBe(false)
        })
    })
})
