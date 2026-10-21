import { ts } from "ts-morph"

const {
    createSourceFile,
    ScriptTarget,
    ScriptKind,
    SyntaxKind,
    canHaveModifiers,
    getModifiers,
    getJSDocCommentsAndTags,
    isJSDoc,
    isFunctionDeclaration,
    isClassDeclaration,
    isInterfaceDeclaration,
    isTypeAliasDeclaration,
    isVariableStatement,
    isIdentifier,
} = ts
import type { DocumentationSection, SourceFile } from "@urm/features/dev/grep"

export const extract_api_documentation = (
    file: SourceFile
): DocumentationSection[] => {
    const source = createSourceFile(
        file.path,
        file.text,
        ScriptTarget.Latest,
        true,
        ScriptKind.TS
    )
    const module_name = (file.path.split("/").at(-1) ?? "").replace(/\.ts$/, "")
    const sections: DocumentationSection[] = []
    for (const statement of source.statements) {
        if (
            !canHaveModifiers(statement) ||
            !getModifiers(statement)?.some(
                (modifier) => modifier.kind === SyntaxKind.ExportKeyword
            )
        )
            continue
        const names = isVariableStatement(statement)
            ? statement.declarationList.declarations.flatMap((declaration) =>
                  isIdentifier(declaration.name) ? [declaration.name.text] : []
              )
            : (isFunctionDeclaration(statement) ||
                    isClassDeclaration(statement) ||
                    isInterfaceDeclaration(statement) ||
                    isTypeAliasDeclaration(statement)) &&
                statement.name !== undefined
              ? [statement.name.text]
              : []
        const type_only =
            isInterfaceDeclaration(statement) ||
            isTypeAliasDeclaration(statement)
        const comments = getJSDocCommentsAndTags(statement).filter(isJSDoc)
        for (const comment of comments) {
            const raw = comment.getText(source)
            if (/@internal\b/.test(raw)) continue
            const text = raw
                .replace(/^\/\*\*|\*\/$/g, "")
                .split("\n")
                .map((line) => line.replace(/^\s*\* ?/, ""))
                .filter((line) => !/^@(category|since)\b/.test(line))
                .join("\n")
                .trim()
                .replace(/\{@link ([^}]+)\}/g, "`$1`")
                .replace(/^```(\w+)[^\n]*$/gm, "```$1")
            if (text === "") continue
            const start_line =
                source.getLineAndCharacterOfPosition(statement.getStart(source))
                    .line + 1
            const end_line =
                source.getLineAndCharacterOfPosition(statement.getEnd()).line +
                1
            for (const name of names)
                sections.push({
                    id: `${file.path}:api:${name}:${comment.pos}`,
                    path: file.path,
                    title: type_only ? `${name} (type)` : name,
                    page_title: `${module_name} API`,
                    aliases: type_only
                        ? [`${module_name}.${name} (type)`]
                        : [`${module_name}.${name}`, name],
                    text,
                    associations: [
                        {
                            source_path: file.path,
                            start_line,
                            end_line,
                            reason: "Documents this region",
                        },
                    ],
                })
        }
    }
    return sections
}
