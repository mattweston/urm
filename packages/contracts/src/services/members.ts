/**
 * # Members Service
 *
 * API interface implemented by web, native, or test layers
 */
import { Member } from "@urm/domain/schemas/members"

export interface MembersApi {
    list(): Promise<Member[]>

    get(params: { id: string }): Promise<Member>

    create(data: {
        id: string
        first: string
        last: string
        twitter?: string
        avatar?: string
        notes?: string
        updated_at: number
    }): Promise<{ item: Member; txid: number }>

    update(params: {
        id: string
        data: Partial<Member>
    }): Promise<{ item: Member; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
