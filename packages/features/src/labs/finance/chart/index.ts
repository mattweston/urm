export { view } from "./view.ts"
export const chart_href = () => "/finance/chart"
export const is_chart_path = (path: string): boolean =>
    path.replace(/\/$/, "") === "/finance/chart"
