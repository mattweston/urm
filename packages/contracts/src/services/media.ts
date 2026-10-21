/**
 * # Media Service
 *
 * API interface implemented by web, native, or test layers
 */
import { CreateImageInput, Image } from "@urm/domain/schemas/media"

export interface ImagesApi {
    list(params?: { after?: number }): Promise<Image[]>

    get(params: { id: string }): Promise<Image>

    create(data: CreateImageInput): Promise<{ item: Image; txid: number }>

    update(params: {
        id: string
        data: Partial<Image>
    }): Promise<{ item: Image; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}
