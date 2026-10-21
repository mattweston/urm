import { Data, Effect, Record as Record_, Schema as S } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"

// CONSTANT

const HTTP_OK_MIN = 200
const HTTP_OK_MAX = 299

export class FetchJsonError extends Data.TaggedError("FetchJsonError")<{
    readonly reason: string
}> {}

// HTTP

export const isSuccessfulStatus = (status: number): boolean =>
    status >= HTTP_OK_MIN && status <= HTTP_OK_MAX

export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : `${error}`

export const makeUrl = (
    url: string,
    params: Readonly<Record<string, string>>
): string => {
    const searchParams = new URLSearchParams(params)
    return `${url}?${searchParams.toString()}`
}

export const encodePackageName = (packageName: string): string =>
    encodeURIComponent(packageName)

export const fetchJson =
    (client: HttpClient.HttpClient) =>
    <A, I>(schema: S.Codec<A, I>) =>
    (
        url: string,
        headers: Readonly<Record<string, string>> = Record_.empty()
    ): Effect.Effect<A, FetchJsonError> =>
        Effect.gen(function* () {
            const request = HttpClientRequest.get(url).pipe(
                HttpClientRequest.setHeaders(headers)
            )
            const response = yield* client.execute(request)

            if (!isSuccessfulStatus(response.status)) {
                return yield* Effect.fail(
                    new FetchJsonError({
                        reason: `GET ${url} returned HTTP ${response.status}.`,
                    })
                )
            }

            return yield* S.decodeUnknownEffect(schema)(
                yield* response.json
            ).pipe(
                Effect.mapError(
                    (error) =>
                        new FetchJsonError({ reason: errorMessage(error) })
                )
            )
        }).pipe(
            Effect.mapError((error) =>
                error instanceof FetchJsonError
                    ? error
                    : new FetchJsonError({ reason: errorMessage(error) })
            )
        )
