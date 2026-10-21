import { Schema as S } from "effect"

import * as Counter from "./island/counter.ts"
import { BlogRoute } from "./route.ts"

export const PersonalBlogModel = S.Struct({
    route: BlogRoute,
    // Owned by the blog rather than by a post: the counter an island renders is
    // ordinary Model state, so it survives navigating between posts.
    counter: Counter.Model,
})
export type PersonalBlogModel = typeof PersonalBlogModel.Type
