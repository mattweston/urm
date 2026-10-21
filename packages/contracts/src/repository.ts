/**
 * # Repository
 *
 * The write-result pair every repository returns. Not reachable from outside
 * the package — a flat file, and the export map's `./*` appends `/index.ts`.
 */

export interface ItemResult<T> {
    item: T
    txid: number
}
