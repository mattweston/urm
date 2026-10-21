/**
 * # CSV Service
 *
 * API interface implemented by web, native, or test layers
 */
import {
    CsvUpload,
    CsvData,
    CreateCsvUploadRequest,
    CreateCsvDataRequest,
} from "@urm/domain/schemas/csv"

export interface CsvUploadsApi {
    list(params?: { after?: number }): Promise<CsvUpload[]>

    get(params: { id: string }): Promise<CsvUpload>

    create(
        data: CreateCsvUploadRequest
    ): Promise<{ item: CsvUpload; txid: number }>

    update(params: {
        id: string
        data: Partial<CsvUpload>
    }): Promise<{ item: CsvUpload; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>
}

export interface CsvDataApi {
    create(data: CreateCsvDataRequest): Promise<{ item: CsvData; txid: number }>

    delete(params: { id: string }): Promise<{ txid: number }>

    getByUpload(params: { upload_id: string }): Promise<CsvData[]>
}
