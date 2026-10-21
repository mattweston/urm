import { Option } from "effect"
import { describe, expect, test } from "vitest"

import * as Domains from "./submodel.ts"

const domain_id = "domain-1"
const domain = Domains.Domain.make({
    id: domain_id,
    name: "Test One",
    slug: "test1",
    updated_at: 1,
})

describe("domains publishing feature", () => {
    test("creates a domain with a name-derived slug", () => {
        const [draft] = Domains.update(
            Domains.init(),
            Domains.ChangedNewDomainName({ value: "Client Preview" }),
            [domain],
            Option.some(domain_id)
        )
        const [, commands] = Domains.update(
            draft,
            Domains.SubmittedNewDomain(),
            [domain],
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("CreateDomain")
        expect(commands[0]?.args).toEqual({
            name: "Client Preview",
            slug: "client-preview",
        })
    })

    test("keeps the generated subdomain slug synchronized with its name", () => {
        const [first_draft] = Domains.update(
            Domains.init(),
            Domains.ChangedNewSubdomainName({ value: "Client" }),
            [domain],
            Option.some(domain_id)
        )
        const [complete_draft] = Domains.update(
            first_draft,
            Domains.ChangedNewSubdomainName({ value: "Client Preview" }),
            [domain],
            Option.some(domain_id)
        )

        expect(complete_draft.new_subdomain_slug).toBe("client-preview")
    })

    test("creates a scoped publishable subdomain from the inline draft", () => {
        const model = Domains.Model.make({
            ...Domains.init(),
            new_subdomain_name: "Research Survey",
            new_subdomain_slug: "research-survey",
            new_subdomain_kind: "survey",
            new_subdomain_status: "draft",
            new_subdomain_access: "link",
            new_subdomain_expires_at: "2026-09-30",
        })
        const [, commands] = Domains.update(
            model,
            Domains.SubmittedNewSubdomain(),
            [domain],
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("CreateSubdomain")
        expect(commands[0]?.args).toEqual({
            domain_id,
            name: "Research Survey",
            slug: "research-survey",
            kind: "survey",
            status: "draft",
            access: "link",
            expires_at: new Date("2026-09-30T23:59:59.999Z").getTime(),
        })
    })

    test("refuses to delete the active domain", () => {
        const [confirming] = Domains.update(
            Domains.init(),
            Domains.RequestedDeleteDomain({ domain_id }),
            [domain],
            Option.some(domain_id)
        )
        const [blocked, commands] = Domains.update(
            confirming,
            Domains.ConfirmedDeleteDomain(),
            [domain],
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(0)
        expect(Option.getOrNull(blocked.error)).toContain(
            "active or final domain"
        )
    })
})
