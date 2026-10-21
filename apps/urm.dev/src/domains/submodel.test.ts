import { Option } from "effect"
import { describe, expect, test } from "vitest"

import * as DesktopDomains from "./submodel.ts"

const workspace = {
    id: "workspace-one",
    name: "Test One",
    slug: "test1",
    organization_name: "Personal",
    can_write: true,
}

describe("desktop domains adapter", () => {
    test("creates root domains through the PostgreSQL workspace command", () => {
        const model = {
            ...DesktopDomains.init(),
            account_id: "account-one",
            domain_id: workspace.id,
            can_write: true,
        }
        const [draft] = DesktopDomains.update(
            model,
            DesktopDomains.ChangedNewDomainName({ value: "Client Preview" }),
            [workspace],
            Option.some(workspace.id)
        )
        const [, commands] = DesktopDomains.update(
            draft,
            DesktopDomains.SubmittedNewDomain(),
            [workspace],
            Option.some(workspace.id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("DomainMutation")
        expect(commands[0]?.args).toEqual({
            epoch: 0,
            account_id: "account-one",
            operation: "create",
            domain_id: "",
            name: "Client Preview",
            slug: "client-preview",
        })
    })

    test("uses PostgreSQL workspace IDs when editing a root domain", () => {
        const model = {
            ...DesktopDomains.init(),
            account_id: "account-one",
            domain_id: workspace.id,
            can_write: true,
        }
        const [editing] = DesktopDomains.update(
            model,
            DesktopDomains.StartedEditingDomain({
                domain_id: workspace.id,
                name: workspace.name,
            }),
            [workspace],
            Option.some(workspace.id)
        )
        const [renamed] = DesktopDomains.update(
            editing,
            DesktopDomains.ChangedEditingDomainName({ value: "Renamed" }),
            [workspace],
            Option.some(workspace.id)
        )
        const [, commands] = DesktopDomains.update(
            renamed,
            DesktopDomains.SubmittedDomainEdit(),
            [workspace],
            Option.some(workspace.id)
        )

        expect(commands[0]?.name).toBe("DomainMutation")
        expect(commands[0]?.args).toEqual({
            epoch: 0,
            account_id: "account-one",
            operation: "update",
            domain_id: workspace.id,
            name: "Renamed",
            slug: "renamed",
        })
    })
})
