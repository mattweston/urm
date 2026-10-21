export { view } from "./view.ts"
export const chart_href = () => "/labs/finance/chart"
export const is_chart_path = (path: string): boolean =>
    path.replace(/\/$/, "") === "/labs/finance/chart"
