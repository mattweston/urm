import { Schema as S } from "effect"

const HttpUrl = S.String.check(S.isPattern(/^https?:\/\/[^\s]+$/i))

export const TourDate = S.Struct({
    id: S.String,
    title: S.String,
    date: S.NullOr(S.String),
    day: S.NullOr(S.String),
    prices: S.NullOr(S.String),
    start_time: S.NullOr(S.String),
    ticket_link_url: S.NullOr(HttpUrl),
    artist_page_url: S.NullOr(HttpUrl),
    map_url: S.NullOr(HttpUrl),
    address: S.NullOr(S.String),
    email: S.NullOr(S.String),
    phone: S.NullOr(S.String),
    note: S.NullOr(S.String),
    confirmation: S.NullOr(S.String),
})
export type TourDate = typeof TourDate.Type

export const TourDateGroup = S.Struct({
    id: S.String,
    title: S.String,
    order: S.Number,
    dates: S.Array(TourDate),
})
export type TourDateGroup = typeof TourDateGroup.Type
