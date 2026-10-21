import * as Ui from "@foldkit/ui"
import { Result } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ResultDemo from "./result.ts"

type ToParentMessage<ParentMessage> = (
    message: ResultDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: ResultDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Result examples"),
        ],
        ResultDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ResultDemo.SelectedResultStage({ stage })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const result_card = <ParentMessage>(
    result: Result.Result<unknown, unknown>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Result.isSuccess(result)
        ? h.div(
              [
                  h.Class(
                      "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-5"
                  ),
              ],
              [
                  h.div(
                      [
                          h.Class(
                              "text-[10px] font-semibold tracking-wider text-success uppercase"
                          ),
                      ],
                      ["Success"]
                  ),
                  h.div(
                      [h.Class("mt-3 font-mono text-sm font-semibold")],
                      [
                          typeof result.success === "object"
                              ? JSON.stringify(result.success)
                              : String(result.success),
                      ]
                  ),
              ]
          )
        : h.div(
              [
                  h.Class(
                      "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-5"
                  ),
              ],
              [
                  h.div(
                      [
                          h.Class(
                              "text-[10px] font-semibold tracking-wider text-destructive uppercase"
                          ),
                      ],
                      ["Failure"]
                  ),
                  h.div(
                      [h.Class("mt-3 font-mono text-sm font-semibold")],
                      [String(result.failure)]
                  ),
              ]
          )

const construct_choice = <ParentMessage>(
    mode: ResultDemo.ConstructMode,
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ResultDemo.SelectedResultConstructMode({ mode }),
        to_parent_message,
        model.construct_mode === mode,
        h
    )

const construct_view = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = ResultDemo.construct_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · construct a Result",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            construct_choice(
                                "Success",
                                model,
                                to_parent_message,
                                h
                            ),
                            construct_choice(
                                "Failure",
                                model,
                                to_parent_message,
                                h
                            ),
                            construct_choice(
                                "Option",
                                model,
                                to_parent_message,
                                h
                            ),
                            construct_choice(
                                "Try",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5 text-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Input"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 font-mono text-sm")],
                                        [
                                            model.construct_mode === "Success"
                                                ? "42"
                                                : model.construct_mode ===
                                                    "Failure"
                                                  ? '"not found"'
                                                  : model.construct_mode ===
                                                      "Option"
                                                    ? model.option_present
                                                        ? "Option.some(Ada)"
                                                        : "Option.none()"
                                                    : model.try_valid_json
                                                      ? '{"name":"Ada"}'
                                                      : "not json",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.construct_mode === "Success"
                                        ? "Result.succeed →"
                                        : model.construct_mode === "Failure"
                                          ? "Result.fail →"
                                          : model.construct_mode === "Option"
                                            ? "Result.fromOption →"
                                            : "Result.try →",
                                ]
                            ),
                            result_card(result, h),
                        ]
                    ),
                    model.construct_mode === "Option" ||
                    model.construct_mode === "Try"
                        ? controls(
                              [
                                  action(
                                      model.construct_mode === "Option"
                                          ? model.option_present
                                              ? "Use Option.none"
                                              : "Use Option.some"
                                          : model.try_valid_json
                                            ? "Use invalid JSON"
                                            : "Use valid JSON",
                                      model.construct_mode === "Option"
                                          ? ResultDemo.ClickedToggleResultOption()
                                          : ResultDemo.ClickedToggleResultTryJson(),
                                      to_parent_message,
                                      false,
                                      h
                                  ),
                              ],
                              h
                          )
                        : h.empty,
                ],
                h
            ),
            panel(
                "Result is data",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Result<A, E> is an eager synchronous value: either Success<A> or Failure<E>. Unlike Effect, creating or transforming a Result does not schedule work, require services, or involve Fibers.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const transform_input_choice = <ParentMessage>(
    input: ResultDemo.TransformInput,
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        input,
        ResultDemo.SelectedResultTransformInput({ input }),
        to_parent_message,
        model.transform_input === input,
        h
    )

const transform_node = <ParentMessage>(
    label: string,
    value: string,
    active: boolean,
    tone: "neutral" | "success" | "failure",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name = !active
        ? "border-border opacity-30"
        : tone === "success"
          ? "border-success/40 bg-success/5"
          : tone === "failure"
            ? "border-destructive/40 bg-destructive/5"
            : "border-chart-2/40 bg-chart-2/5"

    return h.div(
        [
            h.Class(
                `rounded-[var(--radius-surface)] border p-4 text-center ${class_name}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div([h.Class("mt-2 font-mono text-xs font-semibold")], [value]),
        ]
    )
}

const transform_view = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const input = ResultDemo.transform_input_value(model)
    const step1 =
        input > 0 ? `Success(${input})` : `Failure("${input} is not positive")`
    const step2 = input > 0 ? `Success(${input * 2})` : step1
    const step3 =
        input > 0 ? step2 : `Failure("Validation: ${input} is not positive")`

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · map, flatMap, mapError",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            transform_input_choice(
                                "Positive",
                                model,
                                to_parent_message,
                                h
                            ),
                            transform_input_choice(
                                "Negative",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center"
                            ),
                        ],
                        [
                            transform_node(
                                "start",
                                `Success(${input})`,
                                true,
                                "neutral",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ flatMap validate →"]
                            ),
                            transform_node(
                                "validated",
                                step1,
                                model.transform_step >= 1,
                                input > 0 ? "success" : "failure",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ map ×2 →"]
                            ),
                            transform_node(
                                "mapped",
                                step2,
                                model.transform_step >= 2,
                                input > 0 ? "success" : "failure",
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→ mapError →"]
                            ),
                            transform_node(
                                "final",
                                step3,
                                model.transform_step >= 3,
                                input > 0 ? "success" : "failure",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run next",
                                ResultDemo.ClickedAdvanceResultTransform(),
                                to_parent_message,
                                model.transform_step >= 3,
                                h
                            ),
                            action(
                                "Reset",
                                ResultDemo.ClickedResetResultTransform(),
                                to_parent_message,
                                model.transform_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Short-circuiting",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "map transforms Success only. mapError transforms Failure only. flatMap can introduce a new failure, and once a Failure exists the later success transformations are skipped.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const recover_choice = <ParentMessage>(
    mode: ResultDemo.RecoverMode,
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ResultDemo.SelectedResultRecoverMode({ mode }),
        to_parent_message,
        model.recover_mode === mode,
        h
    )

const recover_view = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const source = ResultDemo.recover_source(model)
    const output = ResultDemo.recover_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · collapse or recover",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            recover_choice(
                                "Match",
                                model,
                                to_parent_message,
                                h
                            ),
                            recover_choice(
                                "Fallback",
                                model,
                                to_parent_message,
                                h
                            ),
                            recover_choice(
                                "MapError",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(source, h),
                            h.span(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.recover_mode === "Match"
                                        ? "match →"
                                        : model.recover_mode === "Fallback"
                                          ? "getOrElse →"
                                          : "mapError →",
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Output"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [output]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.recover_success
                                    ? "Use Failure"
                                    : "Use Success",
                                ResultDemo.ClickedToggleResultRecoverBranch(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Different goals",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.recover_mode === "Match"
                                ? "match handles both branches and collapses the Result into one plain output type."
                                : model.recover_mode === "Fallback"
                                  ? "getOrElse unwraps Success or computes a fallback value for Failure."
                                  : "mapError keeps the Result shape and transforms only its typed failure value.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const combine_choice = <ParentMessage>(
    mode: ResultDemo.CombineMode,
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        ResultDemo.SelectedResultCombineMode({ mode }),
        to_parent_message,
        model.combine_mode === mode,
        h
    )

const combine_view = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const combined = ResultDemo.combine_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · combine Results",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            combine_choice("All", model, to_parent_message, h),
                            combine_choice("Gen", model, to_parent_message, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    result_card(Result.succeed("Ada"), h),
                                    result_card(
                                        model.combine_age_ok
                                            ? Result.succeed(36)
                                            : Result.fail("age unavailable"),
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.combine_mode === "All"
                                        ? "Result.all →"
                                        : "yield* / Result.gen →",
                                ]
                            ),
                            result_card(combined, h),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.combine_age_ok
                                    ? "Make age fail"
                                    : "Make age succeed",
                                ResultDemo.ClickedToggleResultCombineAge(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "all vs gen",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.combine_mode === "All"
                                ? "Result.all combines independent Results into a tuple or struct and returns the first Failure it encounters."
                                : "Result.gen gives sequential yield* syntax. It is still evaluated eagerly and synchronously; a yielded Failure stops the generator immediately.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: ResultDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Construct"
                ? construct_view(model, to_parent_message, h)
                : model.stage === "Transform"
                  ? transform_view(model, to_parent_message, h)
                  : model.stage === "Recover"
                    ? recover_view(model, to_parent_message, h)
                    : combine_view(model, to_parent_message, h),
        ]
    )
