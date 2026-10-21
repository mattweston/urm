export const STICKING = [
    "LH",
    "RH",
    "LH",
    "RH",
    "LH",
    "RH",
    "LH",
    "RH",
    "LH",
    "RH",
    "LH",
    "RH",
] as const

export const RHYTHMS = {
    sixEight: {
        label: "6/8",
        groups: [3, 3, 3, 3],
        voice: ["boom", "bap", "boom", "bap"],
    },
    fiveFour: {
        label: "5/4",
        groups: [3, 3, 2, 2],
        voice: ["boom", "bap", "boom", "bap"],
    },
    sevenFour: {
        label: "7/4",
        groups: [3, 3, 4, 4],
        voice: ["boom", "bap", "boom", "bap"],
    },
    twoFour: {
        label: "2/4",
        groups: [3, 3, 2],
        voice: ["boom", "boom", "bap"],
    },
    threeFour: {
        label: "3/4",
        groups: [4, 4, 4],
        voice: ["boom", "bap", "bap"],
    },
} as const

export type RhythmId = keyof typeof RHYTHMS

export const rhythmIds: ReadonlyArray<RhythmId> = [
    "sixEight",
    "fiveFour",
    "sevenFour",
    "twoFour",
    "threeFour",
]

export const totalUnits = (rhythmId: RhythmId): number =>
    RHYTHMS[rhythmId].groups.reduce((total, group) => total + group, 0)

export const groupStarts = (rhythmId: RhythmId): ReadonlyArray<number> => {
    const starts: Array<number> = []
    let offset = 0

    for (const group of RHYTHMS[rhythmId].groups) {
        starts.push(offset)
        offset += group
    }

    return starts
}

export const voiceAtUnit = (
    rhythmId: RhythmId,
    unit: number
): "boom" | "bap" | undefined => {
    const rhythm = RHYTHMS[rhythmId]
    const starts = groupStarts(rhythmId)
    const groupIndex = starts.indexOf(unit)

    return groupIndex === -1 ? undefined : rhythm.voice[groupIndex]
}
