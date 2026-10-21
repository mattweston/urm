import type { Html } from "foldkit/html"

import { directory, file, FileTree, placeholder } from "./file-tree.ts"

const example_entries = [
    directory(
        "src",
        [
            directory("components", [
                file("file-tree.ts", {
                    comment: "Typed Foldkit component",
                    highlighted: true,
                }),
                file("icons.ts", { comment: "File and folder icons" }),
            ]),
            directory("content", [
                file("getting-started.md"),
                file("architecture.mdx"),
            ]),
            file("main.ts", { comment: "Application entry point" }),
            file("styles.css"),
        ],
        { open: true }
    ),
    directory("public", [
        file("logo.svg"),
        directory("uploads", [placeholder()], { open: false }),
    ]),
    file("package.json"),
    file("README.md"),
]

export const view = (): Html =>
    FileTree({
        label: "Example project files",
        entries: example_entries,
    })
