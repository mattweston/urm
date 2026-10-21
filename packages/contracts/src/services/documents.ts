/**
 * # Documents Service
 *
 * API interface implemented by web, native, or test layers
 */
import { CreateDocumentInput, Document } from "@urm/domain/schemas/documents"

export interface DocumentsApi {
    list(): Promise<Document[]>

    listBlogPosts(): Promise<Document[]>

    get(params: { id: string }): Promise<Document>

    getBySlug(params: { slug: string }): Promise<Document>

    create(data: CreateDocumentInput): Promise<{ item: Document; txid: number }>

    update(params: {
        id: string
        data: Partial<Document>
    }): Promise<{ item: Document; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
