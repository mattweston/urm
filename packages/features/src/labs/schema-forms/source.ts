// Vite turns these source files into HTML modules with default exports.
// eslint-disable-next-line import/default
import task_html from "./task-schema.ts?highlighted"
// eslint-disable-next-line import/default
import issue_html from "./issue-schema.ts?highlighted"

// ExplainLines renders each span as a block; preserve empty spans, not separators.
export const prepare_explain_lines = (html: string): string =>
    html
        .replace(/\n\s*(?=<span class="line")/g, "")
        .replace(/\n\s*(?=<\/code>)/g, "")

export const task_source = prepare_explain_lines(task_html)
export const issue_source = prepare_explain_lines(issue_html)
