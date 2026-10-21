import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const all_short_circuit_example: Example = define({
    key: "AllShortCircuit",
    title: "Effect.all",
    subtitle: "short circuit",
    description: "Stop execution on the first error encountered",
    source: [
        "const balance = readAccountBalance()",
        "const credit = checkCreditScore()",
        "const payment = chargeCreditCard()",
        "",
        "const result = Effect.all([balance, credit, payment])",
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: "Effect.all([balance, credit, payment])",
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "readAccountBalance()" }),
        HighlightSelector.Text({ text: "checkCreditScore()" }),
        HighlightSelector.Text({ text: "chargeCreditCard()" }),
    ],
})

export const all_short_circuit_step_labels = ["balance", "credit", "payment"]

export const all_short_circuit_balance_value = primitive("$58")
export const all_short_circuit_error = "Too Low!"

const balance_duration = 600
const credit_duration = 550

// Upstream cycles which of the three fails; the first run of the cycle is the
// one that fails on `credit`, and that is the run worth showing — `payment`
// never starts, which is the whole point of short-circuiting.
export const all_short_circuit_credit_start = balance_duration
export const all_short_circuit_failed_at =
    balance_duration + credit_duration - STEP_SETTLE_LEAD_MILLIS

export const all_short_circuit_timeline: ReadonlyArray<StepEvent> = [
    started(0, 0),
    completed(
        0,
        balance_duration - STEP_SETTLE_LEAD_MILLIS,
        all_short_circuit_balance_value
    ),
    started(1, all_short_circuit_credit_start),
    failed(1, all_short_circuit_failed_at, all_short_circuit_error),
    notified(all_short_circuit_failed_at, all_short_circuit_error),
]

export const all_short_circuit_durations = [balance_duration, credit_duration]
