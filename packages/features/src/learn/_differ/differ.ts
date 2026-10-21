import { Differ, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN + CONCRETE DIFFER
// -----------------------------------------------------------------------------

export type Role = "viewer" | "editor" | "admin"

export type Profile = Readonly<{
    name: string
    role: Role
    alerts: boolean
}>

export type ProfileChange =
    | Readonly<{
          _tag: "SetName"
          value: string
      }>
    | Readonly<{
          _tag: "SetRole"
          value: Role
      }>
    | Readonly<{
          _tag: "SetAlerts"
          value: boolean
      }>

export type ProfilePatch = ReadonlyArray<ProfileChange>

export const profileDiffer: Differ.Differ<Profile, ProfilePatch> = {
    empty: [],

    diff(oldValue, newValue) {
        const changes: Array<ProfileChange> = []

        if (oldValue.name !== newValue.name) {
            changes.push({
                _tag: "SetName",
                value: newValue.name,
            })
        }

        if (oldValue.role !== newValue.role) {
            changes.push({
                _tag: "SetRole",
                value: newValue.role,
            })
        }

        if (oldValue.alerts !== newValue.alerts) {
            changes.push({
                _tag: "SetAlerts",
                value: newValue.alerts,
            })
        }

        return changes
    },

    combine(first, second) {
        return [...first, ...second]
    },

    patch(oldValue, patch) {
        return patch.reduce<Profile>((profile, change) => {
            if (change._tag === "SetName") {
                return {
                    ...profile,
                    name: change.value,
                }
            }

            if (change._tag === "SetRole") {
                return {
                    ...profile,
                    role: change.value,
                }
            }

            return {
                ...profile,
                alerts: change.value,
            }
        }, oldValue)
    },
}

export const base_profile: Profile = {
    name: "Ada",
    role: "viewer",
    alerts: true,
}

const equal_profile = (left: Profile, right: Profile): boolean =>
    left.name === right.name &&
    left.role === right.role &&
    left.alerts === right.alerts

export const format_profile = (profile: Profile): string =>
    `${profile.name} · ${profile.role} · alerts ${profile.alerts ? "on" : "off"}`

export const format_change = (change: ProfileChange): string => {
    if (change._tag === "SetName") {
        return `name → "${change.value}"`
    }

    if (change._tag === "SetRole") {
        return `role → ${change.value}`
    }

    return `alerts → ${change.value ? "on" : "off"}`
}

export const format_patch = (patch: ProfilePatch): string =>
    patch.length === 0 ? "[]" : patch.map(format_change).join("\n")

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Diff"),
    S.Literal("Combine"),
    S.Literal("Patch"),
    S.Literal("Contract"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Diff",
    "Combine",
    "Patch",
    "Contract",
]

export const DiffCase = S.Union([
    S.Literal("RoleOnly"),
    S.Literal("NameAndAlerts"),
    S.Literal("NoChange"),
])
export type DiffCase = typeof DiffCase.Type

export const CombineOrder = S.Union([
    S.Literal("FirstThenSecond"),
    S.Literal("SecondThenFirst"),
])
export type CombineOrder = typeof CombineOrder.Type

export const ReplayBase = S.Union([
    S.Literal("Original"),
    S.Literal("Alternate"),
])
export type ReplayBase = typeof ReplayBase.Type

export const Model = S.Struct({
    stage: Stage,
    diffCase: DiffCase,
    combineOrder: CombineOrder,
    replayBase: ReplayBase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Diff: {
        eyebrow: "compute change",
        title: "diff turns before + after into a reusable patch",
        description:
            "The Differ decides what a patch means. This demo emits only the field replacements needed to transform one Profile into another.",
        code: `const patch = profileDiffer.diff(
    oldProfile,
    newProfile
)

// old
// Ada · viewer · alerts on

// patch
// role → editor

// new
// Ada · editor · alerts on`,
        apis: ["Differ.Differ", "differ.diff"],
        notice: "Differ does not prescribe a patch format. Your implementation owns both the patch representation and the logic that computes the smallest or most useful change description.",
    },

    Combine: {
        eyebrow: "compose changes",
        title: "combine preserves patch order",
        description:
            "Patches can be accumulated before they are applied. For this list-based differ, combine concatenates operations, so later operations can override earlier ones.",
        code: `const combined =
    profileDiffer.combine(
        patchA,
        patchB
    )

const final =
    profileDiffer.patch(
        base,
        combined
    )

// patch order is significant`,
        apis: ["differ.combine", "differ.patch"],
        notice: "combine(first, second) represents applying first and then second. It is not required to be commutative: changing the order can legitimately change the result.",
    },

    Patch: {
        eyebrow: "apply later",
        title: "patch interprets change against a base value",
        description:
            "A patch is data. Once computed it can be stored, transmitted, combined, or applied later—as long as your patch representation makes sense for that base value.",
        code: `const patch =
    profileDiffer.diff(
        original,
        desired
    )

const replayed =
    profileDiffer.patch(
        anotherProfile,
        patch
    )`,
        apis: ["differ.diff", "differ.patch"],
        notice: "The generic Differ contract guarantees how your implementation computes and applies patches; portability across unrelated base values depends on the patch semantics you choose.",
    },

    Contract: {
        eyebrow: "four-part interface",
        title: "empty, diff, combine, patch are the whole abstraction",
        description:
            "Differ is deliberately only an interface. The empty patch is the identity, diff describes change, combine composes change, and patch interprets it.",
        code: `interface Differ<T, Patch> {
    readonly empty: Patch

    diff(
        oldValue: T,
        newValue: T
    ): Patch

    combine(
        first: Patch,
        second: Patch
    ): Patch

    patch(
        oldValue: T,
        patch: Patch
    ): T
}`,
        apis: [
            "Differ.Differ",
            "differ.empty",
            "differ.diff",
            "differ.combine",
            "differ.patch",
        ],
        notice: "There are no constructors or built-in patch formats in this module today. Differ is the protocol: concrete data structures decide how patches are represented and optimized.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

const diff_target = (diffCase: DiffCase): Profile =>
    diffCase === "RoleOnly"
        ? {
              ...base_profile,
              role: "editor",
          }
        : diffCase === "NameAndAlerts"
          ? {
                ...base_profile,
                name: "Grace",
                alerts: false,
            }
          : base_profile

export type DiffSnapshot = Readonly<{
    before: Profile
    after: Profile
    patch: ProfilePatch
    operationCount: number
    replayed: Profile
    roundTrip: boolean
}>

export const diff_snapshot = (model: Model): DiffSnapshot => {
    const before = base_profile
    const after = diff_target(model.diffCase)
    const patch = profileDiffer.diff(before, after)
    const replayed = profileDiffer.patch(before, patch)

    return {
        before,
        after,
        patch,
        operationCount: patch.length,
        replayed,
        roundTrip: equal_profile(replayed, after),
    }
}

export const patch_a: ProfilePatch = [
    {
        _tag: "SetRole",
        value: "editor",
    },
    {
        _tag: "SetAlerts",
        value: false,
    },
]

export const patch_b: ProfilePatch = [
    {
        _tag: "SetRole",
        value: "admin",
    },
    {
        _tag: "SetName",
        value: "Grace",
    },
]

export type CombineSnapshot = Readonly<{
    firstName: string
    secondName: string
    first: ProfilePatch
    second: ProfilePatch
    combined: ProfilePatch
    result: Profile
    finalRole: Role
    operationCount: number
}>

export const combine_snapshot = (model: Model): CombineSnapshot => {
    const isForward = model.combineOrder === "FirstThenSecond"

    const first = isForward ? patch_a : patch_b

    const second = isForward ? patch_b : patch_a

    const combined = profileDiffer.combine(first, second)

    const result = profileDiffer.patch(base_profile, combined)

    return {
        firstName: isForward ? "patch A" : "patch B",
        secondName: isForward ? "patch B" : "patch A",
        first,
        second,
        combined,
        result,
        finalRole: result.role,
        operationCount: combined.length,
    }
}

const desired_profile: Profile = {
    name: "Grace",
    role: "editor",
    alerts: false,
}

const alternate_profile: Profile = {
    name: "Lin",
    role: "admin",
    alerts: true,
}

export type PatchSnapshot = Readonly<{
    source: Profile
    desired: Profile
    patch: ProfilePatch
    replayBase: Profile
    result: Profile
    sourceRoundTrip: boolean
    changedFields: number
}>

export const patch_snapshot = (model: Model): PatchSnapshot => {
    const patch = profileDiffer.diff(base_profile, desired_profile)

    const replayBase =
        model.replayBase === "Original" ? base_profile : alternate_profile

    const result = profileDiffer.patch(replayBase, patch)

    return {
        source: base_profile,
        desired: desired_profile,
        patch,
        replayBase,
        result,
        sourceRoundTrip: equal_profile(
            profileDiffer.patch(base_profile, patch),
            desired_profile
        ),
        changedFields: patch.length,
    }
}

export type ContractSnapshot = Readonly<{
    empty: ProfilePatch
    patchEmpty: Profile
    leftIdentity: ProfilePatch
    rightIdentity: ProfilePatch
    emptyPreservesValue: boolean
    leftIdentityHolds: boolean
    rightIdentityHolds: boolean
    sequentialLawHolds: boolean
}>

const patch_equal = (left: ProfilePatch, right: ProfilePatch): boolean =>
    format_patch(left) === format_patch(right)

export const contract_snapshot = (): ContractSnapshot => {
    const sample = patch_a

    const patchEmpty = profileDiffer.patch(base_profile, profileDiffer.empty)

    const leftIdentity = profileDiffer.combine(profileDiffer.empty, sample)

    const rightIdentity = profileDiffer.combine(sample, profileDiffer.empty)

    const middle: Profile = {
        ...base_profile,
        role: "editor",
    }

    const final: Profile = {
        name: "Grace",
        role: "admin",
        alerts: false,
    }

    const first = profileDiffer.diff(base_profile, middle)

    const second = profileDiffer.diff(middle, final)

    const sequential = profileDiffer.patch(
        base_profile,
        profileDiffer.combine(first, second)
    )

    return {
        empty: profileDiffer.empty,
        patchEmpty,
        leftIdentity,
        rightIdentity,
        emptyPreservesValue: equal_profile(patchEmpty, base_profile),
        leftIdentityHolds: patch_equal(leftIdentity, sample),
        rightIdentityHolds: patch_equal(rightIdentity, sample),
        sequentialLawHolds: equal_profile(sequential, final),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedDifferStage: {
        stage: Stage,
    },
    SelectedDifferCase: {
        diffCase: DiffCase,
    },
    SelectedDifferCombineOrder: {
        combineOrder: CombineOrder,
    },
    SelectedDifferReplayBase: {
        replayBase: ReplayBase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Diff",
    diffCase: "RoleOnly",
    combineOrder: "FirstThenSecond",
    replayBase: "Original",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedDifferStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedDifferCase: ({ diffCase }) => ({
            model: modifyFields(model, {
                diffCase: () => diffCase,
            }),
        }),

        SelectedDifferCombineOrder: ({ combineOrder }) => ({
            model: modifyFields(model, {
                combineOrder: () => combineOrder,
            }),
        }),

        SelectedDifferReplayBase: ({ replayBase }) => ({
            model: modifyFields(model, {
                replayBase: () => replayBase,
            }),
        }),
    })
