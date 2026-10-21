import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { EventCatalogRecord, EventAction } from "@urm/domain/events"
export const EventCatalog = Entity.make("EventCatalog", EventCatalogRecord)
export const EventSummary = EventCatalog.select({
    id: true,
    events: true,
    menu_items: true,
})
export const DomainEvents = Query.make("DomainEvents", {
    Input: { domain_id: Schema.String },
    Result: EventCatalog,
})
export const ChangeEvents = Mutation.make("ChangeEvents", {
    Input: {
        account_id: Schema.optional(Schema.String),
        domain_id: Schema.String,
        action: EventAction,
    },
    Output: { domain_id: Schema.String },
})
export const EventsRemote = Remote.define({
    entities: [EventCatalog],
    queries: [DomainEvents],
    mutations: [ChangeEvents],
})
