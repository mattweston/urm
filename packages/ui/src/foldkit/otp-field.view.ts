import { type Html, inertHtml, type HtmlBuilder } from "foldkit/html"

export const REGEXP_ONLY_DIGITS = "^\\d*$"
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]*$"
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]*$"

type WithClassProps = Readonly<{
    class?: string
}>

type OTPFieldRootProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html>
}>

type OTPFieldInputProps<ParentMessage> = Readonly<{
    class?: string
    value: string
    onInput: (value: string) => ParentMessage
    placeholder?: string
    autocomplete?: string
    ariaLabel?: string
    disabled?: boolean
    maxLength?: number
}>

type OTPFieldSlotProps = Readonly<{
    class?: string
    value: string
    index: number
    length: number
    isActive?: boolean
    isFirstInGroup?: boolean
    isLastInGroup?: boolean
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

const otpField_h = inertHtml

export const OTPField = (props: OTPFieldRootProps): Html =>
    otpField_h.div(
        [
            otpField_h.Class(
                joinClassName(
                    "relative group inline-flex items-center gap-2",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )

export const OTPFieldInput = <ParentMessage>(
    props: OTPFieldInputProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    (() => {
        return h.input([
            h.Type("text"),
            h.Value(props.value),
            ...(props.placeholder !== undefined
                ? [h.Placeholder(props.placeholder)]
                : []),
            ...(props.autocomplete !== undefined
                ? [h.Autocomplete(props.autocomplete)]
                : []),
            ...(props.ariaLabel !== undefined
                ? [h.AriaLabel(props.ariaLabel)]
                : []),
            ...(props.disabled ? [h.Disabled(true)] : []),
            h.OnInput((value) => props.onInput(value)),
            h.Class(
                joinClassName(
                    "absolute inset-0 z-20 h-full w-full cursor-text rounded-[var(--radius-control)] border-(length:--field-border-width) border-transparent bg-transparent px-0 py-0 text-transparent caret-transparent outline-none",
                    props.class
                )
            ),
        ])
    })()

export const OTPFieldGroup = (props: OTPFieldRootProps): Html =>
    otpField_h.div(
        [otpField_h.Class(joinClassName("flex items-center", props.class))],
        props.children ?? []
    )

export const OTPFieldSlot = (props: OTPFieldSlotProps): Html => {
    const char = props.value.slice(props.index, props.index + 1)
    const isCaretVisible =
        (props.isActive ?? true) &&
        props.value.length === props.index &&
        props.value.length < props.length
    const isFirstInGroup = props.isFirstInGroup ?? false
    const isLastInGroup = props.isLastInGroup ?? false
    const ringRadiusClassName = isFirstInGroup
        ? "rounded-l-[var(--radius-control)]"
        : isLastInGroup
          ? "rounded-r-[var(--radius-control)]"
          : ""
    const slotClassName = joinClassName(
        "relative flex size-10 items-center justify-center border-y-(length:--field-border-width) border-r-(length:--field-border-width) border-input text-sm",
        joinClassName(
            isFirstInGroup
                ? "border-l-(length:--field-border-width) rounded-l-[var(--radius-control)]"
                : "",
            isLastInGroup ? "rounded-r-[var(--radius-control)]" : ""
        )
    )

    return otpField_h.div(
        [otpField_h.Class(joinClassName(slotClassName, props.class))],
        [
            ...(props.isActive
                ? [
                      otpField_h.div(
                          [
                              otpField_h.Class(
                                  joinClassName(
                                      "pointer-events-none absolute inset-0 transition-all ring-2 ring-ring ring-offset-2 ring-offset-background",
                                      ringRadiusClassName
                                  )
                              ),
                          ],
                          []
                      ),
                  ]
                : []),
            otpField_h.span([otpField_h.Class("pointer-events-none")], [char]),
            ...(isCaretVisible
                ? [
                      otpField_h.div(
                          [
                              otpField_h.Class(
                                  "pointer-events-none absolute inset-0 flex items-center justify-center"
                              ),
                          ],
                          [
                              otpField_h.div(
                                  [
                                      otpField_h.Class(
                                          "h-4 w-px bg-foreground animate-[caret-blink_1.25s_ease-out_infinite]"
                                      ),
                                  ],
                                  []
                              ),
                          ]
                      ),
                  ]
                : []),
        ]
    )
}

export const OTPFieldSeparator = (props: WithClassProps = {}): Html =>
    otpField_h.div(
        [
            otpField_h.Class(
                joinClassName(
                    "pointer-events-none px-1 text-muted-foreground",
                    props.class
                )
            ),
        ],
        [
            otpField_h.svg(
                [
                    otpField_h.Xmlns("http://www.w3.org/2000/svg"),
                    otpField_h.ViewBox("0 0 24 24"),
                    otpField_h.Fill("none"),
                    otpField_h.Stroke("currentColor"),
                    otpField_h.StrokeWidth("2"),
                    otpField_h.StrokeLinecap("round"),
                    otpField_h.StrokeLinejoin("round"),
                    otpField_h.Class("size-6"),
                ],
                [
                    otpField_h.circle(
                        [
                            otpField_h.Cx("12.1"),
                            otpField_h.Cy("12.1"),
                            otpField_h.R("1"),
                        ],
                        []
                    ),
                ]
            ),
        ]
    )
