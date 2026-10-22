import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { temperature } from "../../result.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

// The result is the whole call, which spans five lines — a Text selector would
// have to repeat the argument list to stay unambiguous.
export const first_success_of_example: Example = define({
    key: "FirstSuccessOf",
    title: "Effect.firstSuccessOf",
    description:
        "Try effects sequentially and return the first successful result",
    source: [
        "const weatherAPI = fetchFromWeatherAPI()",
        "const localSensor = fetchFromLocalSensor()",
        "const backupService = fetchFromBackupService()",
        "",
        "const result = Effect.firstSuccessOf([",
        "  weatherAPI,",
        "  localSensor,",
        "  backupService",
        "])",
    ].join("\n"),
    result_highlight: HighlightSelector.LineRange({
        start_line: 5,
        end_line: 9,
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "fetchFromWeatherAPI()" }),
        HighlightSelector.Text({ text: "fetchFromLocalSensor()" }),
        HighlightSelector.Text({ text: "fetchFromBackupService()" }),
    ],
})

export const first_success_of_step_labels = [
    "weatherAPI",
    "localSensor",
    "backupService",
]

export const first_success_of_errors = ["Weather API Down", "Local Sensor Down"]
export const first_success_of_degrees = 74
export const first_success_of_value = temperature(first_success_of_degrees)
export const first_success_of_durations = [450, 500, 550]

// Two sources down before the backup answers — one failure would not show that
// the sources are tried strictly in order.
export const first_success_of_timeline: ReadonlyArray<StepEvent> = (() => {
    const [weather = 0, sensor = 0, backup = 0] = first_success_of_durations
    const sensor_start = weather
    const backup_start = weather + sensor
    const weather_failed_at = weather - STEP_SETTLE_LEAD_MILLIS
    const sensor_failed_at = backup_start - STEP_SETTLE_LEAD_MILLIS

    return [
        started(0, 0),
        failed(0, weather_failed_at, first_success_of_errors[0] ?? ""),
        notified(weather_failed_at, first_success_of_errors[0] ?? ""),
        started(1, sensor_start),
        failed(1, sensor_failed_at, first_success_of_errors[1] ?? ""),
        notified(sensor_failed_at, first_success_of_errors[1] ?? ""),
        started(2, backup_start),
        completed(
            2,
            backup_start + backup - STEP_SETTLE_LEAD_MILLIS,
            first_success_of_value
        ),
    ]
})()
