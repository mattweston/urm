import { Option, Schema as S } from "effect"

export const VideoId = S.Literals([
    "neon-tides",
    "quiet-current",
    "signal-garden",
])
export type VideoId = typeof VideoId.Type
export const WatchPanel = S.Literals(["Overview", "Comments", "Transcript"])
export type WatchPanel = typeof WatchPanel.Type
export const Chapter = S.Struct({ title: S.String, start: S.Number })
export type Chapter = typeof Chapter.Type
export const TranscriptCue = S.Struct({ start: S.Number, text: S.String })
export type TranscriptCue = typeof TranscriptCue.Type
export const Video = S.Struct({
    id: VideoId,
    title: S.String,
    creator: S.String,
    creator_initials: S.String,
    category: S.String,
    description: S.String,
    views: S.String,
    published: S.String,
    accent: S.String,
    chapters: S.Array(Chapter),
    transcript: S.Array(TranscriptCue),
})
export type Video = typeof Video.Type
export const Comment = S.Struct({
    id: S.String,
    index: S.Number,
    author: S.String,
    initials: S.String,
    when: S.String,
    body: S.String,
    likes: S.Number,
    timecode: S.Number,
    creator_liked: S.Boolean,
})
export type Comment = typeof Comment.Type
export const Model = S.Struct({
    video_id: VideoId,
    panel: WatchPanel,
    current_time: S.Number,
    duration: S.Number,
    is_playing: S.Boolean,
    is_muted: S.Boolean,
    is_theater: S.Boolean,
    is_online: S.Boolean,
    liked_video_ids: S.Array(VideoId),
    saved_video_ids: S.Array(VideoId),
    followed_creators: S.Array(S.String),
    queued_actions: S.Number,
    catalog_query: S.String,
    comment_query: S.String,
    comment_sort: S.Literals(["Featured", "Newest"]),
    activity: S.Option(S.String),
})
export type Model = typeof Model.Type

export const videos: ReadonlyArray<Video> = [
    {
        id: "neon-tides",
        title: "Neon tides: a night swim in the city",
        creator: "Northstar Studio",
        creator_initials: "NS",
        category: "Short film",
        description:
            "A quiet visual essay about finding open water between the lights, concrete, and midnight trains of a sleepless city.",
        views: "184K views",
        published: "Premiered 3 days ago",
        accent: "#ff5b8d",
        chapters: [
            { title: "Streetlight", start: 0 },
            { title: "The crossing", start: 2 },
            { title: "Open water", start: 4 },
        ],
        transcript: [
            { start: 0, text: "The city keeps its own kind of tide." },
            {
                start: 2,
                text: "We follow the reflections until the streets fall away.",
            },
            {
                start: 4,
                text: "For six quiet seconds, the horizon belongs to everyone.",
            },
        ],
    },
    {
        id: "quiet-current",
        title: "The quiet current beneath the pines",
        creator: "Field Notes",
        creator_initials: "FN",
        category: "Field journal",
        description:
            "A pocket field journal following meltwater from a high forest into the first broad river bend of spring.",
        views: "92K views",
        published: "Published last week",
        accent: "#79d6b1",
        chapters: [
            { title: "Headwater", start: 0 },
            { title: "Understory", start: 2 },
            { title: "River bend", start: 4 },
        ],
        transcript: [
            {
                start: 0,
                text: "Every river begins as a sound you almost miss.",
            },
            {
                start: 2,
                text: "Below the pines, the snow remembers how to move.",
            },
            { start: 4, text: "By the bend, a whisper has become a current." },
        ],
    },
    {
        id: "signal-garden",
        title: "Growing a garden from radio signals",
        creator: "Good Frequency",
        creator_initials: "GF",
        category: "Design",
        description:
            "An experimental garden turns a day of community radio into shape, color, and movement.",
        views: "61K views",
        published: "Published 2 weeks ago",
        accent: "#c5a1ff",
        chapters: [
            { title: "Tune in", start: 0 },
            { title: "Pattern language", start: 2 },
            { title: "In bloom", start: 4 },
        ],
        transcript: [
            {
                start: 0,
                text: "What if a broadcast could leave something growing behind?",
            },
            {
                start: 2,
                text: "Every voice bends the garden in a different direction.",
            },
            {
                start: 4,
                text: "At sunset, the whole frequency comes into bloom.",
            },
        ],
    },
]
export const videoForId = (id: VideoId): Video => {
    const found = videos.find((video) => video.id === id)
    return (
        found ?? {
            id: "neon-tides",
            title: "Neon tides: a night swim in the city",
            creator: "Northstar Studio",
            creator_initials: "NS",
            category: "Short film",
            description:
                "A quiet visual essay about finding open water between the lights, concrete, and midnight trains of a sleepless city.",
            views: "184K views",
            published: "Premiered 3 days ago",
            accent: "#ff5b8d",
            chapters: [
                { title: "Streetlight", start: 0 },
                { title: "The crossing", start: 2 },
                { title: "Open water", start: 4 },
            ],
            transcript: [
                { start: 0, text: "The city keeps its own kind of tide." },
                {
                    start: 2,
                    text: "We follow the reflections until the streets fall away.",
                },
                {
                    start: 4,
                    text: "For six quiet seconds, the horizon belongs to everyone.",
                },
            ],
        }
    )
}
const authors = [
    ["Mara Vale", "MV"],
    ["Eli Park", "EP"],
    ["Nia Rivers", "NR"],
    ["Priya Moss", "PM"],
]
const thoughts = [
    "The color shift here is so restrained and beautiful.",
    "I came back for the sound design and noticed a new detail.",
    "This feels like a whole evening folded into a few seconds.",
    "That final frame has been living in my head all week.",
]
export const commentsForVideo = (video_id: VideoId): ReadonlyArray<Comment> =>
    Array.from({ length: 180 }, (_, index) => {
        const author = authors[index % authors.length] ?? ["Mara Vale", "MV"]
        return {
            id: `${video_id}-comment-${index + 1}`,
            index,
            author: author[0] ?? "Mara Vale",
            initials: author[1] ?? "MV",
            when:
                index === 0
                    ? "Pinned · 2 hours ago"
                    : `${(index % 23) + 1} hours ago`,
            body:
                index === 0
                    ? "Creator note: look for the reflection just after the second chapter."
                    : (thoughts[index % thoughts.length] ??
                      "Beautifully observed."),
            likes: 4 + ((index * 17 + video_id.length) % 240),
            timecode: index % 3 === 0 ? 2 : 4,
            creator_liked: index % 11 === 0,
        }
    })
export const initialModel = (): Model => ({
    video_id: "neon-tides",
    panel: "Overview",
    current_time: 0,
    duration: 6,
    is_playing: false,
    is_muted: true,
    is_theater: false,
    is_online: true,
    liked_video_ids: [],
    saved_video_ids: [],
    followed_creators: [],
    queued_actions: 0,
    catalog_query: "",
    comment_query: "",
    comment_sort: "Featured",
    activity: Option.some("Neon tides is ready to play"),
})
