import { requiresImageUrlProxy } from "@urm/utils/media"
import type { Model } from "./app.model.ts"

export const image_source = (
    model: Model,
    stored_url: string
): string | undefined =>
    stored_url.length === 0
        ? undefined
        : (model.resolved_image_urls[stored_url] ??
          (requiresImageUrlProxy(stored_url) ? undefined : stored_url))
