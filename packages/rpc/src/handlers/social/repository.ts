import { Context, Effect, Layer } from "effect"
import { Sql } from "@urm/db/sql"
import { SocialAnalyticsSnapshot } from "@urm/contracts/social"
import { connect_social_account, sync_social_accounts } from "./accounts.ts"
import { refresh_social_analytics } from "./analytics.ts"
import { ZernioProviderLive } from "./provider.ts"
import {
    cancel_social_post,
    delete_social_post,
    reconcile_social_post,
    publish_social_draft,
    retry_social_draft_edit,
    submit_social_post,
    update_social_draft,
} from "./submission.ts"
import {
    SocialStore,
    SocialStoreLive,
    type SaveTemplateInput,
    type ReservePostInput,
    type SocialPrincipal,
    type UpdateDraftInput,
} from "./store.ts"

const make = Effect.gen(function* () {
    const db = yield* Sql
    const store = yield* SocialStore
    return {
        load_accounts: (principal: SocialPrincipal) =>
            store.load_accounts(principal).pipe(Effect.provideService(Sql, db)),
        load_posts: (principal: SocialPrincipal) =>
            store.load_posts(principal).pipe(Effect.provideService(Sql, db)),
        load_templates: (principal: SocialPrincipal) =>
            store
                .load_templates(principal)
                .pipe(Effect.provideService(Sql, db)),
        save_template: (principal: SocialPrincipal, input: SaveTemplateInput) =>
            store
                .save_template(principal, input)
                .pipe(Effect.provideService(Sql, db)),
        load_analytics: (
            principal: SocialPrincipal,
            period: typeof SocialAnalyticsSnapshot.Type.period,
            platform: typeof SocialAnalyticsSnapshot.Type.platform,
            account_id: string | null
        ) =>
            store
                .load_analytics(principal, period, platform, account_id)
                .pipe(Effect.provideService(Sql, db)),
        refresh_analytics: (
            principal: SocialPrincipal,
            period: typeof SocialAnalyticsSnapshot.Type.period,
            platform: typeof SocialAnalyticsSnapshot.Type.platform,
            account_id: string | null
        ) =>
            refresh_social_analytics(
                principal,
                period,
                platform,
                account_id
            ).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        sync_accounts: (principal: SocialPrincipal) =>
            sync_social_accounts(principal).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        connect_account: (principal: SocialPrincipal, platform: string) =>
            connect_social_account(principal, platform).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        submit_post: (principal: SocialPrincipal, input: ReservePostInput) =>
            submit_social_post(principal, input).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        publish_draft: (principal: SocialPrincipal, post_id: string) =>
            publish_social_draft(principal, post_id).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        cancel_post: (principal: SocialPrincipal, post_id: string) =>
            cancel_social_post(principal, post_id).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        delete_post: (principal: SocialPrincipal, post_id: string) =>
            delete_social_post(principal, post_id).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        update_draft: (
            principal: SocialPrincipal,
            post_id: string,
            input: UpdateDraftInput
        ) =>
            update_social_draft(principal, post_id, input).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        reconcile_post: (principal: SocialPrincipal, post_id: string) =>
            reconcile_social_post(principal, post_id).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
        retry_draft_edit: (principal: SocialPrincipal, post_id: string) =>
            retry_social_draft_edit(principal, post_id).pipe(
                Effect.provide(ZernioProviderLive),
                Effect.provideService(Sql, db),
                Effect.provideService(SocialStore, store)
            ),
    }
})
export class SocialRepository extends Context.Service<
    SocialRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/SocialRepository") {}
export const SocialRepositoryLive = Layer.effect(SocialRepository, make).pipe(
    Layer.provide(SocialStoreLive)
)
