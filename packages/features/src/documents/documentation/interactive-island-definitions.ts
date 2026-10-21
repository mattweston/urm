import { Schema as S } from "effect"

export const documentationInteractiveIslandDefinitions = {
    Tabs: S.Struct({
        labels: S.String,
        label: S.optionalKey(S.String),
    }),
    TabItem: S.Struct({}),
    CodeTabs: S.Struct({
        labels: S.String,
        label: S.optionalKey(S.String),
    }),
    ImportedExample: S.Struct({
        path: S.String,
        region: S.optionalKey(S.String),
        title: S.optionalKey(S.String),
    }),
    CodeLines: S.Struct({
        selectable: S.optionalKey(S.Literals(["true"])),
        lockOnSelect: S.optionalKey(S.Literals(["true"])),
    }),
    ExplainLines: S.Struct({}),
    LineExplanation: S.Struct({
        line: S.NumberFromString,
        title: S.optionalKey(S.String),
    }),
    BugFix: S.Struct({}),
    SyntaxAnimation: S.Struct({ titles: S.String }),
    StyleguideAnimation: S.Struct({ descriptions: S.String }),
    LayoutAnimator: S.Struct({
        id: S.String,
        label: S.optionalKey(S.String),
    }),
    AudioHighlight: S.Struct({
        ranges: S.String,
        explanations: S.optionalKey(S.String),
        scale: S.optionalKey(
            S.Literals(["major", "minor", "pentatonic", "blues"])
        ),
        root: S.optionalKey(S.String),
    }),
}
