import type { Example } from "../../catalog.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"

const source = [
    "const phone = checkNotifications()",
    'const checking = Effect.repeat(phone, Schedule.spaced("2 seconds"))',
].join("\n")

export const repeat_spaced_example: Example = define({
    key: "RepeatSpaced",
    title: "Effect.repeat",
    subtitle: "spaced",
    description: "Repeat an effect with a fixed delay between each execution",
    source,
    result_highlight: HighlightSelector.Text({
        text: 'Effect.repeat(phone, Schedule.spaced("2 seconds"))',
    }),
    step_highlights: [HighlightSelector.Text({ text: "checkNotifications()" })],
})

export const repeat_spaced_step_labels = ["phone"]
export const repeat_spaced_messages = [
    "📞 Unknown Caller",
    "📧 Cellphone Bill",
    "🔔 0 New Messages!",
    "💬 We have to talk...",
    "📅 Dinner Cancelled",
    "📰 War!",
    "😴 Nothing...",
    "😴 Still nothing",
    "🕳️ Doomscrolling",
    "🪫 Battery Low",
    "💔 Swiped Left",
    "🏠 Rent Overdue",
    "💸 Account Overdrawn",
    "🚕 Driver Cancelled",
    "🚫 Friend Request Denied",
    "📅 Meeting Moved to 4am",
    "🌧️ Rain All Week",
    "📉 Stocks Down 20%",
    "🥀 Plant Died",
]
export const repeat_spaced_values = repeat_spaced_messages.map(primitive)
export const repeat_spaced_attempt_duration = 500
export const repeat_spaced_start_delays = Array.from(
    { length: repeat_spaced_messages.length + 1 },
    (_, index) => index * 2_500
)

// One attempt past the end of the messages, which is the attempt where the
// phone dies and ends the repeat.
export const repeat_spaced_timeline: ReadonlyArray<StepEvent> =
    repeat_spaced_start_delays.flatMap((at_millis, attempt_index) => {
        const settled_at =
            at_millis + repeat_spaced_attempt_duration - STEP_SETTLE_LEAD_MILLIS
        const message = repeat_spaced_messages[attempt_index]

        if (message === undefined) {
            return [
                started(0, at_millis),
                failed(0, settled_at, "phone died"),
                notified(settled_at, "phone died"),
            ]
        }

        return [
            started(0, at_millis),
            completed(0, settled_at, primitive(message)),
        ]
    })
