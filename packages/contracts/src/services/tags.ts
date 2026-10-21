/**
 * # Tags Service
 *
 * API interface implemented by web, native, or test layers
 */
import { EntityTag, Tag } from "@urm/domain/schemas/tags"

export interface TagsApi {
    list(): Promise<Tag[]>

    get(params: { id: string }): Promise<Tag>

    create(data: {
        id: string
        name: string
        color: string
        description?: string
        updated_at: number
    }): Promise<{ item: Tag; txid: number }>

    update(params: {
        id: string
        data: Partial<Tag>
    }): Promise<{ item: Tag; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}

export interface EntityTagsApi {
    list(params?: {
        entity_type?: string
        entity_id?: string
    }): Promise<EntityTag[]>

    create(data: {
        id: string
        entity_type: string
        entity_id: string
        tag_id: string
        updated_at: number
    }): Promise<{ item: EntityTag; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>

    set(params: {
        entity_type: string
        entity_id: string
        tag_ids: string[]
    }): Promise<{ txid: number }>
}
