import { Effect } from "effect"
import { Command } from "foldkit"
import { FailedLoadingMembers, MembersLoaded } from "./members.message.ts"
export const LoadMembers = Command.define("LoadMembers", {
    messages: [MembersLoaded, FailedLoadingMembers],
    execute: Effect.succeed(
        FailedLoadingMembers({
            error: "No members persistence adapter installed",
        })
    ),
})
