/**
 * # Contacts Service
 *
 * API interface implemented by web, native, or test layers
 */
import { Contact, CreateContactInput } from "@urm/domain/schemas/contacts"

export interface ContactsApi {
    list(): Promise<Contact[]>

    get(params: { id: string }): Promise<Contact>

    create(data: CreateContactInput): Promise<{ item: Contact; txid: number }>

    update(params: {
        id: string
        data: Partial<Contact>
    }): Promise<{ item: Contact; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
