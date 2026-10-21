export const monthly_data = [
    { month: "Jan", income: 1200000, expenses: 840000 },
    { month: "Feb", income: 1050000, expenses: 1120000 },
    { month: "Mar", income: 1480000, expenses: 970000 },
    { month: "Apr", income: 1620000, expenses: 1080000 },
    { month: "May", income: 1530000, expenses: 1160000 },
    { month: "Jun", income: 1890000, expenses: 1250000 },
]

export const totals = monthly_data.reduce(
    (total, month) => ({
        income: total.income + month.income,
        expenses: total.expenses + month.expenses,
        net: total.net + month.income - month.expenses,
    }),
    { income: 0, expenses: 0, net: 0 }
)

const currency = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
})

export const format_money = (pence: number): string =>
    currency.format(pence / 100)
