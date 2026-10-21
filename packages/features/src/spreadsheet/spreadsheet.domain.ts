export const ROW_COUNT = 1_000
export const COLUMN_COUNT = 80
export const MAX_CELL_TEXT_LENGTH = 20_000
export const WORKBOOK_STORAGE_KEY = "gridlab:atlas-workbook:v1"

export type CellAddress = Readonly<{ row: number; column: number }>
export type CellValues = Readonly<Record<string, string>>

const initiatives = [
    "Atlas launch",
    "Mobile renewal",
    "Search quality",
    "Partner portal",
    "Billing migration",
    "Onboarding refresh",
    "Analytics studio",
    "Support automation",
]
const owners = ["Mira", "Theo", "Inez", "Cal", "Nora", "Ari"]
const statuses = ["On track", "At risk", "Planned", "In review"]

export const cellKey = (address: CellAddress): string =>
    `${address.row}:${address.column}`

export const editorId = (address: CellAddress): string =>
    `spreadsheet-editor-${address.row}-${address.column}`

export const cellId = (address: CellAddress): string =>
    `spreadsheet-cell-${address.row}-${address.column}`

export const columnLabel = (index: number): string => {
    let value = index + 1
    let label = ""
    while (value > 0) {
        const remainder = (value - 1) % 26
        label = String.fromCharCode(65 + remainder) + label
        value = Math.floor((value - 1) / 26)
    }
    return label
}

export const addressLabel = (address: CellAddress): string =>
    `${columnLabel(address.column)}${address.row + 1}`

export const clampAddress = (address: CellAddress): CellAddress => ({
    row: Math.max(0, Math.min(ROW_COUNT - 1, address.row)),
    column: Math.max(0, Math.min(COLUMN_COUNT - 1, address.column)),
})

export const parseAddress = (value: string): CellAddress | undefined => {
    const match = /^\s*([a-z]{1,3})([1-9]\d*)\s*$/i.exec(value)
    if (match === null) {
        return undefined
    }
    const letters = match[1] ?? ""
    let column = 0
    for (const letter of letters.toUpperCase()) {
        column = column * 26 + letter.charCodeAt(0) - 64
    }
    const address = { row: Number(match[2]) - 1, column: column - 1 }
    return Number.isSafeInteger(address.row) &&
        address.row >= 0 &&
        address.row < ROW_COUNT &&
        address.column >= 0 &&
        address.column < COLUMN_COUNT
        ? address
        : undefined
}

export const baseCellRaw = (address: CellAddress): string => {
    const number = address.row + 1
    if (address.column === 0) {
        return `${initiatives[address.row % initiatives.length] ?? "Initiative"}${address.row < 8 ? "" : ` ${number}`}`
    }
    if (address.column === 1) {
        return String(1_200 + ((address.row * 137) % 4_800))
    }
    if (address.column === 2) {
        return String(430 + ((address.row * 89) % 2_900))
    }
    if (address.column === 3) {
        return `=B${number}-C${number}`
    }
    if (address.column === 4) {
        return owners[address.row % owners.length] ?? ""
    }
    if (address.column === 5) {
        return statuses[address.row % statuses.length] ?? ""
    }
    return ""
}

export const readRaw = (cells: CellValues, address: CellAddress): string =>
    cells[cellKey(address)] ?? baseCellRaw(address)

const numericValue = (
    cells: CellValues,
    address: CellAddress,
    stack: Set<string>
): number | string => {
    const key = cellKey(address)
    if (stack.has(key)) {
        return "#CYCLE!"
    }
    const raw = readRaw(cells, address).trim()
    if (raw === "") {
        return 0
    }
    if (!raw.startsWith("=")) {
        const number = Number(raw.replaceAll(",", ""))
        return Number.isFinite(number) ? number : "#VALUE!"
    }
    stack.add(key)
    const expression = raw.slice(1).trim()
    const binary =
        /^([A-Z]{1,3}[1-9]\d*|-?\d+(?:\.\d+)?)\s*([+\-*/])\s*([A-Z]{1,3}[1-9]\d*|-?\d+(?:\.\d+)?)$/i.exec(
            expression
        )
    if (binary === null) {
        stack.delete(key)
        return "#VALUE!"
    }
    const operand = (token: string): number | string => {
        const address = parseAddress(token)
        return address === undefined
            ? Number(token)
            : numericValue(cells, address, stack)
    }
    const left = operand(binary[1] ?? "")
    const right = operand(binary[3] ?? "")
    if (typeof left === "string" || typeof right === "string") {
        stack.delete(key)
        return typeof left === "string" ? left : right
    }
    const operator = binary[2]
    const result =
        operator === "+"
            ? left + right
            : operator === "-"
              ? left - right
              : operator === "*"
                ? left * right
                : right === 0
                  ? "#DIV/0!"
                  : left / right
    stack.delete(key)
    return result
}

export const displayCell = (
    cells: CellValues,
    address: CellAddress
): string => {
    const raw = readRaw(cells, address)
    if (!raw.trim().startsWith("=")) {
        return raw
    }
    const result = numericValue(cells, address, new Set())
    return typeof result === "number" && !Number.isInteger(result)
        ? String(Math.round(result * 100) / 100)
        : String(result)
}
