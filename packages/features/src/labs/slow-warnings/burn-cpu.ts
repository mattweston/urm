export const burnCpu = (durationMs: number): number => {
    const stopAt = performance.now() + durationMs
    let checksum = 0

    while (performance.now() < stopAt) {
        checksum = (checksum + Math.sqrt(checksum + 1)) % 100000
    }

    return checksum
}
