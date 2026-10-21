import { Schema as S } from "effect"

export const documentationStaticIslandDefinitions = {
    Callout: S.Struct({
        tone: S.Literals(["Note", "Tip", "Warning", "Danger"]),
        title: S.optionalKey(S.String),
    }),
    Card: S.Struct({
        title: S.String,
        icon: S.optionalKey(
            S.Literals(["Document", "Info", "Terminal", "Zap"])
        ),
    }),
    CardGrid: S.Struct({
        stagger: S.optionalKey(S.Literals(["true"])),
    }),
    Steps: S.Struct({}),
    DescList: S.Struct({}),
    DescItem: S.Struct({
        term: S.String,
    }),
    FileTree: S.Struct({}),
    TreeDirectory: S.Struct({
        name: S.String,
        open: S.optionalKey(S.Literals(["true"])),
    }),
    TreeFile: S.Struct({
        name: S.String,
        comment: S.optionalKey(S.String),
        highlight: S.optionalKey(S.Literals(["true"])),
    }),
    TreePlaceholder: S.Struct({}),
    ModelSidebar: S.Struct({}),
    ModelNode: S.Struct({
        name: S.String,
        kind: S.optionalKey(S.Literals(["Model", "Submodel", "State"])),
        sidebar: S.optionalKey(S.String),
        route: S.optionalKey(S.String),
        open: S.optionalKey(S.Literals(["true"])),
    }),
    Accordions: S.Struct({}),
    Accordion: S.Struct({
        title: S.String,
        id: S.optionalKey(S.String),
        open: S.optionalKey(S.Literals(["true"])),
    }),
}
