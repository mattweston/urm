import { Option, Schema as S } from "effect"
import { Chapter, chapters } from "./storymap.chapter.ts"

export const Model = S.Struct({
    chapters: S.Array(Chapter),
    // The chapter that last crossed the middle of the viewport. None until the
    // first one does, which is why the map opens on chapters[0]'s camera.
    maybeActiveChapterId: S.Option(S.String),
    maybeMapHostId: S.Option(S.String),
    maybeMapError: S.Option(S.String),
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    chapters,
    maybeActiveChapterId: Option.none(),
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
}
