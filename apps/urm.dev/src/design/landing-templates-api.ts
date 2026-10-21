import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    LandingTemplateCatalogEntity,
    LandingTemplateCatalogQuery,
    RemoveLandingTemplate,
    SaveLandingTemplate,
} from "@urm/contracts/landing-templates"
import type { SaveLandingTemplateInput } from "@urm/domain/landing-templates"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const LandingTemplates = Remote.make({
    model: Cache.model.remote,
    entities: [LandingTemplateCatalogEntity],
    queries: [LandingTemplateCatalogQuery],
    mutations: [SaveLandingTemplate, RemoveLandingTemplate],
})
const unavailable = () =>
    new AccountRequestError({
        status: 404,
        message:
            "Landing templates could not be loaded. Refresh and try again.",
    })

export const load_landing_templates = Effect.fn("LandingTemplates.load")(
    function* (domain_id: string) {
        const api = yield* ContactsApi
        const query = LandingTemplates.query(
            LandingTemplateCatalogQuery,
            { domain_id },
            {
                select: LandingTemplateCatalogEntity.select({
                    id: true,
                    templates: true,
                }),
                first: 1,
            }
        )
        const loaded = yield* LandingTemplates.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const result = query.read(loaded)
        if (result._tag !== "Ready" || !result.value.items[0])
            return yield* Effect.fail(unavailable())
        return result.value.items[0]
    }
)

export const save_landing_template = Effect.fn("LandingTemplates.save")(
    function* (
        domain_id: string,
        account_id: string,
        template: SaveLandingTemplateInput
    ) {
        const api = yield* ContactsApi
        const result = yield* Remote.mutate(
            SaveLandingTemplate,
            { domain_id, account_id, template },
            crypto.randomUUID()
        ).pipe(Effect.provide(api.remote(domain_id)))
        return result.output
    }
)

export const remove_landing_template = Effect.fn("LandingTemplates.remove")(
    function* (domain_id: string, account_id: string, template_id: string) {
        const api = yield* ContactsApi
        const result = yield* Remote.mutate(
            RemoveLandingTemplate,
            { domain_id, account_id, template_id },
            crypto.randomUUID()
        ).pipe(Effect.provide(api.remote(domain_id)))
        return result.output
    }
)
