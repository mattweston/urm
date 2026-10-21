import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    PublicationEmailTheme,
    PublicationEmailThemeQuery,
} from "@urm/contracts/mail"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const Data = Remote.make({
    model: Cache.model.remote,
    entities: [PublicationEmailTheme],
    queries: [PublicationEmailThemeQuery],
})

export const load_publication_theme = Effect.fn("Mail.loadPublicationTheme")(
    function* (domain_id: string) {
        const api = yield* ContactsApi
        const query = Data.query(
            PublicationEmailThemeQuery,
            { domain_id },
            {
                select: PublicationEmailTheme.select({
                    id: true,
                    domain_id: true,
                    brand_name: true,
                    site_theme: true,
                }),
                first: 1,
            }
        )
        const loaded = yield* Data.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const result = query.read(loaded)
        const theme =
            result._tag === "Ready" ? result.value.items[0] : undefined
        if (theme === undefined || theme.domain_id !== domain_id)
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 404,
                    message: "Publication email theme is unavailable.",
                })
            )
        return theme
    }
)
