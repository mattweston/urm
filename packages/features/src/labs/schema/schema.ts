import { Result, Schema as S, SchemaIssue } from "effect"

const RequiredText = S.Trimmed.check(S.isMinLength(2), S.isMaxLength(80))
const Year = S.NumberFromString.check(
    S.isInt(),
    S.isBetween({ minimum: 2020, maximum: 2100 })
)

export const Submission = S.Struct({
    name: RequiredText,
    email: S.Trimmed.check(S.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    age: S.NumberFromString.check(
        S.isInt(),
        S.isBetween({ minimum: 18, maximum: 120 })
    ),
    availability: S.Struct({ from: Year, to: Year }).check(
        S.makeFilter(({ from, to }) =>
            from <= to
                ? undefined
                : {
                      path: ["to"],
                      issue: "End year must be on or after start year.",
                  }
        )
    ),
    addresses: S.Array(
        S.Struct({
            city: RequiredText,
            postal_code: S.String.check(
                S.makeFilter((value) =>
                    /^[A-Z]{1,2}[0-9R][0-9A-Z]? ?[0-9][ABDEFGHJLNPQRSTUWXYZ]{2}$/i.test(
                        value
                    )
                        ? undefined
                        : "Enter a UK postcode, for example LS6 1NS."
                )
            ),
        })
    ).check(S.isMinLength(1), S.isMaxLength(3)),
})
export type Submission = typeof Submission.Type

export const Draft = S.Struct({
    name: S.String,
    email: S.String,
    age: S.String,
    availability: S.Struct({ from: S.String, to: S.String }),
    addresses: S.Array(S.Struct({ city: S.String, postal_code: S.String })),
})
export type Draft = typeof Draft.Type

export const decode = S.decodeUnknownResult(Submission, { errors: "all" })
const format_issues = SchemaIssue.makeFormatterStandardSchemaV1()

export const inspect = (draft: Draft) => {
    const result = decode(draft)
    return {
        result,
        issues: Result.isFailure(result)
            ? format_issues(result.failure.issue).issues.map((issue) => ({
                  path: (issue.path ?? [])
                      .map((segment) =>
                          String(
                              typeof segment === "object"
                                  ? segment.key
                                  : segment
                          )
                      )
                      .join("."),
                  message: issue.message,
              }))
            : [],
    }
}

export const empty_draft: Draft = {
    name: "",
    email: "",
    age: "",
    availability: { from: "", to: "" },
    addresses: [{ city: "", postal_code: "" }],
}

export const valid_draft: Draft = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    age: "36",
    availability: { from: "2026", to: "2028" },
    addresses: [{ city: "Leeds", postal_code: "LS6 1NS" }],
}

export const invalid_draft: Draft = {
    name: "A",
    email: "not-an-email",
    age: "seventeen",
    availability: { from: "2028", to: "2026" },
    addresses: [
        { city: "", postal_code: "12" },
        { city: "Paris", postal_code: "abcde" },
    ],
}
