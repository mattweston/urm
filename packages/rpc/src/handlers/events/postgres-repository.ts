import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    EventRecord,
    EventMenuRecord,
    EventAction,
    EventWriteError,
} from "@urm/domain/events"
export interface EventsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new EventWriteError({
        message: "Event unavailable, changed or access denied.",
    })
const authorize_events = Effect.fn("Events.authorize")(function* (
    principal: EventsPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Events")
})
const load_catalog = Effect.fn("Events.load")(function* (
    principal: EventsPrincipal
) {
    yield* authorize_events(principal, principal.domain_id)
    const events = yield* query_rows(
        EventRecord,
        sql`SELECT id,domain_id,title,description,date::float8 AS date,start_time,end_time,venue_name,venue_url,latitude,longitude,tickets_url,image_url,published ,updated_at::float8 AS updated_at FROM events WHERE domain_id=${principal.domain_id} ORDER BY date,id LIMIT 51`
    )
    const menu_items = yield* query_rows(
        EventMenuRecord,
        sql`SELECT id,domain_id,event_id,title,description,content,price,category,served_at,slug,image_url,dietary_labels,allergens,published,order_position ,updated_at::float8 AS updated_at FROM event_menu_items WHERE domain_id=${principal.domain_id} ORDER BY order_position,id LIMIT 101`
    )
    if (events.length > 50 || menu_items.length > 100)
        return yield* Effect.fail(
            new EventWriteError({
                message:
                    "This workspace exceeds the supported Events catalog size.",
            })
        )
    return { id: principal.domain_id, events, menu_items }
})
const change_events = Effect.fn("Events.change")(function* (
    principal: EventsPrincipal,
    input: EventAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_events(principal, d, true)
            const action = yield* Schema.decodeUnknownEffect(EventAction)(input)
            const current = yield* load_catalog(principal)
            const now = Date.now()
            switch (action._tag) {
                case "create_event":
                    if (current.events.length >= 50)
                        return yield* Effect.fail(
                            new EventWriteError({
                                message:
                                    "This workspace supports up to 50 events.",
                            })
                        )
                    yield* tx.query(
                        sql`INSERT INTO events (id,domain_id,title,description,date,start_time,end_time,venue_name,venue_url,latitude,longitude,tickets_url,image_url,published,created_at,updated_at) VALUES (${action.id},${d},${action.title},${action.description},${action.date},${action.start_time},${action.end_time},${action.venue_name},${action.venue_url},${action.latitude},${action.longitude},${action.tickets_url},${action.image_url},${action.published},${now},${now})`
                    )
                    break
                case "update_event":
                    if (!current.events.some((row) => row.id === action.id))
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`UPDATE events SET title=${action.title},description=${action.description},date=${action.date},start_time=${action.start_time},end_time=${action.end_time},venue_name=${action.venue_name},venue_url=${action.venue_url},latitude=${action.latitude},longitude=${action.longitude},tickets_url=${action.tickets_url},image_url=${action.image_url},published=${action.published},updated_at=${now} WHERE domain_id=${d} AND id=${action.id}`
                    )
                    break
                case "delete_event":
                    if (!current.events.some((row) => row.id === action.id))
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`DELETE FROM events WHERE domain_id=${d} AND id=${action.id}`
                    )
                    break
                case "create_menu":
                    if (
                        !current.events.some(
                            (row) => row.id === action.event_id
                        )
                    )
                        return yield* Effect.fail(denied())
                    if (current.menu_items.length >= 100)
                        return yield* Effect.fail(
                            new EventWriteError({
                                message:
                                    "This workspace supports up to 100 event menu items.",
                            })
                        )
                    yield* tx.query(
                        sql`INSERT INTO event_menu_items (id,domain_id,event_id,title,description,content,price,category,served_at,slug,image_url,dietary_labels,allergens,published,order_position,created_at,updated_at) VALUES (${action.id},${d},${action.event_id},${action.title},${action.description},${action.content},${action.price},${action.category},${JSON.stringify(action.served_at)}::jsonb,${action.slug},${action.image_url},${action.dietary_labels},${action.allergens},${action.published},${action.order_position},${now},${now})`
                    )
                    break
                case "update_menu":
                    if (!current.menu_items.some((row) => row.id === action.id))
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`UPDATE event_menu_items SET title=${action.title},description=${action.description},content=${action.content},price=${action.price},category=${action.category},served_at=${JSON.stringify(action.served_at)}::jsonb,slug=${action.slug},image_url=${action.image_url},dietary_labels=${action.dietary_labels},allergens=${action.allergens},published=${action.published},order_position=${action.order_position},updated_at=${now} WHERE domain_id=${d} AND id=${action.id}`
                    )
                    break
                case "delete_menu":
                    if (!current.menu_items.some((row) => row.id === action.id))
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`DELETE FROM event_menu_items WHERE domain_id=${d} AND id=${action.id}`
                    )
                    break
                case "reorder_menu":
                    if (
                        new Set(action.ids).size !== action.ids.length ||
                        action.ids.some(
                            (id) =>
                                !current.menu_items.some((row) => row.id === id)
                        )
                    )
                        return yield* Effect.fail(denied())
                    yield* Effect.forEach(action.ids, (id, position) =>
                        tx.query(
                            sql`UPDATE event_menu_items SET category=${action.category},order_position=${position},updated_at=${now} WHERE domain_id=${d} AND id=${id}`
                        )
                    )
            }
            return yield* load_catalog(principal)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_events: (...args: Parameters<typeof authorize_events>) =>
            authorize_events(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_events: (...args: Parameters<typeof change_events>) =>
            change_events(...args).pipe(Effect.provideService(Sql, db)),
    }
})
export class EventsLibraryRepository extends Context.Service<
    EventsLibraryRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/EventsLibraryRepository") {}
export const EventsLibraryRepositoryLive = Layer.effect(
    EventsLibraryRepository,
    make
)
