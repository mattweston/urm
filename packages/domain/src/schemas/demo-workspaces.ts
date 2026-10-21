import { Schema } from "effect"

export const DemoWorkspaceScenario = Schema.Literals([
    "marketing",
    "shop",
    "workspace",
])

export type DemoWorkspaceScenario = Schema.Schema.Type<
    typeof DemoWorkspaceScenario
>

export const DemoWorkspaceDomain = Schema.Struct({
    scenario: DemoWorkspaceScenario,
    domain_id: Schema.String,
    domain_name: Schema.String,
})

export type DemoWorkspaceDomain = Schema.Schema.Type<typeof DemoWorkspaceDomain>

export const DemoWorkspaceProvisioned = Schema.Struct({
    workspace_id: Schema.String,
    expires_at: Schema.Date,
    domains: Schema.Array(DemoWorkspaceDomain),
})

export type DemoWorkspaceProvisioned = Schema.Schema.Type<
    typeof DemoWorkspaceProvisioned
>
