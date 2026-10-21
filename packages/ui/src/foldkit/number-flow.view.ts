import { Array, String as String_, pipe } from "effect"
import { type Html, inertHtml } from "foldkit/html"

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

/**
 * Every column holds all ten digits stacked and is shifted to bring the right
 * one into a one-line window. The shift is the only thing that changes between
 * renders, so a CSS transition does the animation and the component needs no
 * Model, no previous value and no animation frame.
 *
 * Columns are keyed by place value rather than by position in the list, so
 * 9 -> 10 slides the ones column from 9 to 0 and grows a new tens column,
 * instead of renumbering every column and animating all of them.
 */
const digitColumn = (placeValue: number, digit: number): Html => {
    const h = inertHtml

    return h.keyed("span")(
        `place-${placeValue}`,
        [h.Class("inline-block h-[1em] overflow-hidden align-bottom")],
        [
            h.span(
                [
                    h.Class(
                        "flex flex-col transition-transform duration-500 ease-out"
                    ),
                    h.Style({ transform: `translateY(-${digit}em)` }),
                ],
                Array.map(DIGITS, (glyph) =>
                    h.span([h.Class("block h-[1em] leading-[1em]")], [glyph])
                )
            ),
        ]
    )
}

type NumberFlowProps = Readonly<{
    value: number
    class?: string
}>

/**
 * An integer whose digits animate between readings. Values that cannot be read
 * digit by digit — fractions, anything past the safe integer range — fall back
 * to plain text rather than silently rounding.
 */
export const NumberFlow = (props: NumberFlowProps): Html => {
    const h = inertHtml

    if (!Number.isSafeInteger(props.value)) {
        return h.span(
            [h.Class(joinClassName("tabular-nums", props.class))],
            [String(props.value)]
        )
    }

    const digits = pipe(
        Math.abs(props.value).toString(),
        String_.split(""),
        Array.map(Number)
    )

    return h.span(
        [
            h.Class(
                joinClassName(
                    "inline-flex items-end leading-[1em] tabular-nums",
                    props.class
                )
            ),
        ],
        [
            ...(props.value < 0
                ? [h.span([h.Class("leading-[1em]")], ["−"])]
                : []),
            ...Array.map(digits, (digit, digitIndex) =>
                digitColumn(digits.length - 1 - digitIndex, digit)
            ),
        ]
    )
}
