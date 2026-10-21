import type { Html, HtmlBuilder } from 'foldkit/html'

import { aspectRatio } from '../../generated/registry/ui/aspect-ratio'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

const ratioSection = (h: HtmlBuilder<Message>, title: string, ratio: number): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-2')],
    [
      h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], [title]),
      aspectRatio<Message>(
        { ratio, className: 'w-full max-w-sm rounded-lg bg-muted' },
        [
          h.img([
            h.Src('https://avatar.vercel.sh/shadcn1'),
            h.Alt('Photo'),
            h.Class('rounded-lg object-cover grayscale dark:brightness-20'),
            h.Style({
              position: 'absolute',
              height: '100%',
              width: '100%',
              left: '0',
              top: '0',
              right: '0',
              bottom: '0',
              color: 'transparent',
            }),
          ]),
        ],
        h,
      ),
    ],
  )

export const aspectRatioView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      ratioSection(h, '16:9', 16 / 9),
      ratioSection(h, '21:9', 21 / 9),
      ratioSection(h, '1:1', 1 / 1),
      ratioSection(h, '9:16', 9 / 16),
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
