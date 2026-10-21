import type { BillingVariable } from "./billing.message.ts"
import type { Model } from "./billing.model.ts"

// The price list. Constants rather than Model fields: the reader cannot change
// them, so they are not variables.
export const SEAT_PRICE = 12
export const INCLUDED_CONTACTS = 5_000
export const CONTACT_BLOCK = 1_000
export const CONTACT_BLOCK_PRICE = 4
export const INCLUDED_EMAILS = 50_000
export const EMAIL_BLOCK = 10_000
export const EMAIL_BLOCK_PRICE = 6
export const ANNUAL_DISCOUNT = 0.2

export type Range = Readonly<{
    minimum: number
    maximum: number
    step: number
    /** Pointer travel, in pixels, that moves the value by one step. */
    pixelsPerStep: number
}>

// One definition of each variable's bounds, read by the scrubbers, the number
// field and the table of inputs alike.
export const ranges: Readonly<Record<BillingVariable, Range>> = {
    seats: { minimum: 1, maximum: 200, step: 1, pixelsPerStep: 6 },
    contacts: { minimum: 0, maximum: 250_000, step: 500, pixelsPerStep: 2 },
    emailsPerContact: { minimum: 0, maximum: 30, step: 1, pixelsPerStep: 10 },
    budget: { minimum: 0, maximum: 20_000, step: 25, pixelsPerStep: 3 },
}

export type Derived = Readonly<{
    seatCost: number
    billableContacts: number
    contactBlocks: number
    contactCost: number
    emails: number
    billableEmails: number
    emailBlocks: number
    emailCost: number
    listPrice: number
    discount: number
    monthly: number
    yearly: number
    budgetDelta: number
    budgetUsedPercent: number
    /** Seats to give up to come back inside the budget. Zero when inside it. */
    seatsOverBudget: number
    /** Index into the four verdicts in the view. */
    verdictIndex: number
}>

const blocksOver = (value: number, included: number, block: number): number =>
    Math.ceil(Math.max(0, value - included) / block)

// The one place a number is worked out. Called on the way to the view, never
// stored: derived state that lives in the Model is state that can go stale.
export const derive = (model: Model): Derived => {
    const seatCost = model.seats * SEAT_PRICE

    const billableContacts = Math.max(0, model.contacts - INCLUDED_CONTACTS)
    const contactBlocks = blocksOver(
        model.contacts,
        INCLUDED_CONTACTS,
        CONTACT_BLOCK
    )
    const contactCost = contactBlocks * CONTACT_BLOCK_PRICE

    const emails = model.contacts * model.emailsPerContact
    const billableEmails = Math.max(0, emails - INCLUDED_EMAILS)
    const emailBlocks = blocksOver(emails, INCLUDED_EMAILS, EMAIL_BLOCK)
    const emailCost = emailBlocks * EMAIL_BLOCK_PRICE

    const listPrice = seatCost + contactCost + emailCost
    const discount = model.isBilledAnnually ? listPrice * ANNUAL_DISCOUNT : 0
    const monthly = listPrice - discount
    const yearly = monthly * 12

    const budgetDelta = model.budget - monthly
    const budgetUsedPercent =
        model.budget === 0 ? 100 : (monthly / model.budget) * 100

    const seatPriceAfterDiscount = model.isBilledAnnually
        ? SEAT_PRICE * (1 - ANNUAL_DISCOUNT)
        : SEAT_PRICE
    const seatsOverBudget =
        budgetDelta >= 0
            ? 0
            : Math.min(
                  model.seats,
                  Math.ceil(-budgetDelta / seatPriceAfterDiscount)
              )

    const verdictIndex =
        budgetUsedPercent <= 60
            ? 0
            : budgetUsedPercent <= 100
              ? 1
              : budgetUsedPercent <= 150
                ? 2
                : 3

    return {
        seatCost,
        billableContacts,
        contactBlocks,
        contactCost,
        emails,
        billableEmails,
        emailBlocks,
        emailCost,
        listPrice,
        discount,
        monthly,
        yearly,
        budgetDelta,
        budgetUsedPercent,
        seatsOverBudget,
        verdictIndex,
    }
}
