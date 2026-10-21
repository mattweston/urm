import { Option, Schema as S } from "effect"

export const Route = S.TaggedUnion({
    Home: {},
    Saved: {},
    Profile: { handle: S.String },
})
export type Route = typeof Route.Type
export const Person = S.Struct({
    handle: S.String,
    name: S.String,
    initials: S.String,
    bio: S.String,
    accent: S.String,
    followers: S.String,
    following: S.String,
})
export type Person = typeof Person.Type
export const Post = S.Struct({
    id: S.String,
    author: S.String,
    body: S.String,
    time: S.String,
    likes: S.Number,
    liked: S.Boolean,
    saved: S.Boolean,
    replies: S.Number,
    status: S.Literals(["Published", "Sending"]),
})
export type Post = typeof Post.Type
export const PendingLike = S.Struct({
    post_id: S.String,
    operation: S.Number,
    previous_liked: S.Boolean,
    previous_likes: S.Number,
})
export const Notice = S.Struct({
    id: S.Number,
    tone: S.Literals(["Error", "Success"]),
    title: S.String,
    detail: S.String,
    retry_kind: S.Literals(["None", "Post", "Like"]),
    post_id: S.Option(S.String),
    body: S.String,
    target_liked: S.Boolean,
})
export type Notice = typeof Notice.Type
export const Model = S.Struct({
    route: Route,
    posts: S.Array(Post),
    composer: S.String,
    online: S.Boolean,
    following: S.Array(S.String),
    pending_likes: S.Array(PendingLike),
    notices: S.Array(Notice),
    next_sequence: S.Number,
    next_operation: S.Number,
    next_notice: S.Number,
})
export type Model = typeof Model.Type

export const people: ReadonlyArray<Person> = [
    {
        handle: "avery",
        name: "Avery Stone",
        initials: "AS",
        bio: "Design engineer. Building thoughtful tools in public.",
        accent: "#6757d9",
        followers: "4.8K",
        following: "612",
    },
    {
        handle: "maya",
        name: "Maya Chen",
        initials: "MC",
        bio: "Frontend systems, tiny details, and ambitious prototypes.",
        accent: "#e26d5a",
        followers: "12.4K",
        following: "391",
    },
    {
        handle: "kai",
        name: "Kai Bell",
        initials: "KB",
        bio: "Runtime enthusiast. Usually thinking about schedulers.",
        accent: "#238c79",
        followers: "8.1K",
        following: "277",
    },
    {
        handle: "noor",
        name: "Noor Patel",
        initials: "NP",
        bio: "Product designer making complex software feel calm.",
        accent: "#bd6b22",
        followers: "6.3K",
        following: "488",
    },
    {
        handle: "lena",
        name: "Lena Ortiz",
        initials: "LO",
        bio: "Open-source maintainer and keyboard shortcut fan.",
        accent: "#3d6ec9",
        followers: "9.7K",
        following: "354",
    },
    {
        handle: "rowan",
        name: "Rowan Ellis",
        initials: "RE",
        bio: "New here. Learning in public, one small experiment at a time.",
        accent: "#8b5c8e",
        followers: "18",
        following: "42",
    },
]
export const personForHandle = (handle: string): Person =>
    people.find((person) => person.handle === handle) ?? {
        handle,
        name: `@${handle}`,
        initials: "?",
        bio: "This profile is not available in the local Threadline seed.",
        accent: "#6b7280",
        followers: "0",
        following: "0",
    }
export const seedPosts: ReadonlyArray<Post> = [
    {
        id: "maya-release",
        author: "maya",
        body: "We shipped the new component inspector today. The best feature might be the tiny focus trail that made three accessibility bugs obvious.",
        time: "18m",
        likes: 84,
        liked: false,
        saved: true,
        replies: 12,
        status: "Published",
    },
    {
        id: "kai-scheduler",
        author: "kai",
        body: "A good scheduler demo is a real interaction where three useful things overlap and none lose the user’s intent.",
        time: "43m",
        likes: 61,
        liked: false,
        saved: false,
        replies: 8,
        status: "Published",
    },
    {
        id: "noor-design",
        author: "noor",
        body: "If the empty state only explains what is missing, it is unfinished. Give people a confident next step.",
        time: "1h",
        likes: 107,
        liked: true,
        saved: true,
        replies: 19,
        status: "Published",
    },
    {
        id: "maya-prototype",
        author: "maya",
        body: "A prototype became a product the moment someone used keyboard navigation unexpectedly — and it still worked.",
        time: "3h",
        likes: 42,
        liked: false,
        saved: false,
        replies: 6,
        status: "Published",
    },
]
export const postsForRoute = (
    posts: ReadonlyArray<Post>,
    route: Route
): ReadonlyArray<Post> =>
    Route.match(route, {
        Home: () => posts,
        Saved: () => posts.filter((post) => post.saved),
        Profile: ({ handle }) => posts.filter((post) => post.author === handle),
    })
export const initialModel = (): Model => ({
    route: Route.cases.Home.make({}),
    posts: seedPosts,
    composer: "",
    online: true,
    following: [],
    pending_likes: [],
    notices: [],
    next_sequence: 1,
    next_operation: 1,
    next_notice: 1,
})
export const emptyNotice = {
    post_id: Option.none(),
    body: "",
    target_liked: false,
}
