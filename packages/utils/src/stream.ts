/**
 * # Stream Utils
 *
 * Async generator yielding `cb(n)` then "\n" for n in 1..len.
 */

// The 1s delay is the point — this exists to exercise streaming responses, not
// to process data. It is not a general-purpose iteration helper.
export async function* streamNumbers(
    len: number,
    cb: (num: number) => unknown
) {
    for await (const num of Array.from({ length: len }, (_v, n) => n + 1)) {
        await new Promise((resolve) => {
            setTimeout(resolve, 1000)
        })
        yield cb(num)
        yield "\n"
    }
}
