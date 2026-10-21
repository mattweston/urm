/**
 * # Events Service
 *
 * API interface implemented by web, native, or test layers
 */
import {
    CreateEventInput,
    EventMenuItem,
    CreateEventMenuItemInput,
} from "@urm/domain/schemas/events"

export interface EventsApi {
    list(): Promise<Event[]>

    get(params: { id: string }): Promise<Event>

    create(data: CreateEventInput): Promise<{ item: Event; txid: number }>

    update(params: {
        id: string
        data: Partial<Event>
    }): Promise<{ item: Event; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}

export interface EventMenuItemsApi {
    list(): Promise<EventMenuItem[]>

    get(params: { id: string }): Promise<EventMenuItem>

    create(
        data: CreateEventMenuItemInput
    ): Promise<{ item: EventMenuItem; txid: number }>

    update(params: {
        id: string
        data: Partial<EventMenuItem>
    }): Promise<{ item: EventMenuItem; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
