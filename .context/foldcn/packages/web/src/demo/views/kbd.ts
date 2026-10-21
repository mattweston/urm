import type { Html, HtmlBuilder } from 'foldkit/html'

import { Kbd } from '../../generated/registry/ui/kbd'
import {
  inputGroup,
  inputGroupAddon,
  inputGroupInput,
} from '../../generated/registry/ui/input-group'
import { button } from '../../generated/registry/ui/button'
import { icon } from '../../generated/registry/lib/icons'
import { Save, CircleDashed, ArrowLeft, ArrowRight } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const kbdView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              Kbd<Message>({}, ['Ctrl'], h),
              Kbd<Message>({}, ['⌘K'], h),
              Kbd<Message>({}, ['Ctrl + B'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Modifier Keys']),
          h.div(
            [h.Class('flex items-center gap-2')],
            [Kbd<Message>({}, ['⌘'], h), Kbd<Message>({}, ['C'], h)],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['KbdGroup']),
          Kbd.group<Message>(
            {},
            [
              Kbd<Message>({}, ['Ctrl'], h),
              Kbd<Message>({}, ['Shift'], h),
              Kbd<Message>({}, ['P'], h),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Arrow Keys']),
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              Kbd<Message>({}, ['↑'], h),
              Kbd<Message>({}, ['↓'], h),
              Kbd<Message>({}, ['←'], h),
              Kbd<Message>({}, ['→'], h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Icons']),
          Kbd.group<Message>(
            {},
            [
              Kbd<Message>({}, [icon(h, CircleDashed, 'size-3')], h),
              Kbd<Message>({}, [icon(h, ArrowLeft, 'size-3')], h),
              Kbd<Message>({}, [icon(h, ArrowRight, 'size-3')], h),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div(
            [h.Class('px-1 text-xs font-medium text-muted-foreground')],
            ['With Icons and Text'],
          ),
          Kbd.group<Message>(
            {},
            [
              Kbd<Message>({}, [icon(h, ArrowLeft, 'size-3'), ' Left'], h),
              Kbd<Message>({}, [icon(h, CircleDashed, 'size-3'), ' Voice Enabled'], h),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['InputGroup']),
          h.div(
            [h.Class('w-full max-w-sm')],
            [
              inputGroup(
                {},
                [
                  inputGroupInput({ id: 'kbd-input-group', placeholder: '' }, h),
                  inputGroupAddon({}, [Kbd<Message>({}, ['Space'], h)], h),
                ],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Tooltip']),
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              button<Message>({ variant: 'outline', size: 'icon-sm' }, icon(h, Save, 'size-4'), h),
              h.span([h.Class('text-sm text-muted-foreground')], ['Hover for tooltip — S']),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With samp']),
          Kbd<Message>({}, [h.span([], ['File'])], h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Grouped']),
          Kbd.group<Message>(
            {},
            [
              Kbd<Message>({}, ['⌘'], h),
              Kbd<Message>({}, ['⇧'], h),
              Kbd<Message>({}, ['⌥'], h),
              Kbd<Message>({}, ['⌃'], h),
            ],
            h,
          ),
        ],
      ),
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
