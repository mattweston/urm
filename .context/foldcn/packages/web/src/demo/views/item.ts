import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '../../generated/registry/ui/button'
import { Item } from '../../generated/registry/ui/item'
import { icon } from '../../generated/registry/lib/icons'
import { Archive, BadgeCheck, ChevronRight } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

const itemBlock = (
  variant: 'default' | 'outline' | 'muted',
  size: 'default' | 'sm' | 'xs',
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  Item<Message>(
    { variant, size },
    [Item.content<Message>({}, [Item.title<Message>({}, ['Title Only'], h)], h)],
    h,
  ),
  Item<Message>(
    { variant, size },
    [
      Item.content<Message>({}, [Item.title<Message>({}, ['Title + Button'], h)], h),
      Item.actions<Message>(
        {},
        [button<Message>({ variant: 'outline', size: 'sm' }, 'Action', h)],
        h,
      ),
    ],
    h,
  ),
  Item<Message>(
    { variant, size },
    [
      Item.content<Message>(
        {},
        [
          Item.title<Message>({}, ['Title + Description'], h),
          Item.description<Message>(
            {},
            ['This is a description that provides additional context.'],
            h,
          ),
        ],
        h,
      ),
    ],
    h,
  ),
  Item<Message>(
    { variant, size },
    [
      Item.media<Message>({ variant: 'icon' }, [icon(h, Archive, 'size-4')], h),
      Item.content<Message>(
        {},
        [
          Item.title<Message>({}, ['Media + Title + Description'], h),
          Item.description<Message>({}, ['This item includes media, title, and description.'], h),
        ],
        h,
      ),
    ],
    h,
  ),
  Item<Message>(
    { variant, size },
    [
      Item.media<Message>({ variant: 'icon' }, [icon(h, Archive, 'size-4')], h),
      Item.content<Message>(
        {},
        [
          Item.title<Message>({}, ['Media + Title + Description + Button'], h),
          Item.description<Message>(
            {},
            ['Complete item with all components: media, title, description, and button.'],
            h,
          ),
        ],
        h,
      ),
      Item.actions<Message>({}, [button<Message>({ size: 'sm' }, 'Action', h)], h),
    ],
    h,
  ),
]

export const itemView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Default']),
          h.div(
            [h.Class('flex w-full max-w-md flex-col gap-4')],
            itemBlock('default', 'default', h),
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Outline']),
          h.div(
            [h.Class('flex w-full max-w-md flex-col gap-4')],
            itemBlock('outline', 'default', h),
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Muted']),
          h.div([h.Class('flex w-full max-w-md flex-col gap-4')], itemBlock('muted', 'default', h)),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Small']),
          h.div([h.Class('flex w-full max-w-md flex-col gap-4')], itemBlock('default', 'sm', h)),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Extra Small']),
          h.div([h.Class('flex w-full max-w-md flex-col gap-4')], itemBlock('default', 'xs', h)),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Outline — Small']),
          h.div([h.Class('flex w-full max-w-md flex-col gap-4')], itemBlock('outline', 'sm', h)),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['ItemGroup']),
          Item.group<Message>(
            {},
            [
              Item<Message>(
                {},
                [
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Item 1'], h),
                      Item.description<Message>({}, ['First item in the group.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Item<Message>(
                {},
                [
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Item 2'], h),
                      Item.description<Message>({}, ['Second item in the group.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Item<Message>(
                {},
                [
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Item 3'], h),
                      Item.description<Message>({}, ['Third item in the group.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Separator']),
          Item.group<Message>(
            {},
            [
              Item<Message>(
                { variant: 'outline' },
                [
                  Item.media<Message>({ variant: 'icon' }, [icon(h, Archive, 'size-4')], h),
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Inbox'], h),
                      Item.description<Message>({}, ['View all incoming messages.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Item.separator<Message>({}, h),
              Item<Message>(
                { variant: 'outline' },
                [
                  Item.media<Message>({ variant: 'icon' }, [icon(h, Archive, 'size-4')], h),
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Sent'], h),
                      Item.description<Message>({}, ['View all sent messages.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Item.separator<Message>({}, h),
              Item<Message>(
                { variant: 'outline' },
                [
                  Item.media<Message>({ variant: 'icon' }, [icon(h, Archive, 'size-4')], h),
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Drafts'], h),
                      Item.description<Message>({}, ['View all draft messages.'], h),
                    ],
                    h,
                  ),
                ],
                h,
              ),
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
            ['With Header & Footer'],
          ),
          h.div(
            [h.Class('flex w-full max-w-md flex-col gap-4')],
            [
              Item<Message>(
                {},
                [
                  Item.header<Message>(
                    {},
                    [h.span([h.Class('text-sm font-medium')], ['Design System'])],
                    h,
                  ),
                  Item.content<Message>(
                    {},
                    [
                      Item.title<Message>({}, ['Component Library'], h),
                      Item.description<Message>(
                        {},
                        ['A comprehensive collection of reusable UI components.'],
                        h,
                      ),
                    ],
                    h,
                  ),
                  Item.footer<Message>(
                    {},
                    [h.span([h.Class('text-sm text-muted-foreground')], ['Updated 5 minutes ago'])],
                    h,
                  ),
                ],
                h,
              ),
              Item<Message>(
                { variant: 'outline' },
                [
                  Item.content<Message>(
                    {},
                    [Item.title<Message>({}, ['Your profile has been verified.'], h)],
                    h,
                  ),
                  Item.media<Message>({}, [icon(h, BadgeCheck, 'size-5')], h),
                  Item.actions<Message>({}, [icon(h, ChevronRight, 'size-4')], h),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Image']),
          Item<Message>(
            { variant: 'outline' },
            [
              Item.media<Message>(
                { variant: 'image' },
                [
                  h.img([
                    h.Src('https://avatar.vercel.sh/shadcn'),
                    h.Alt('Avatar'),
                    h.Class('size-10 rounded-sm object-cover'),
                  ]),
                ],
                h,
              ),
              Item.content<Message>(
                {},
                [
                  Item.title<Message>({}, ['shadcn'], h),
                  Item.description<Message>(
                    {},
                    ['Creator of shadcn/ui — beautifully designed components.'],
                    h,
                  ),
                ],
                h,
              ),
              Item.actions<Message>(
                {},
                [button<Message>({ size: 'sm', variant: 'outline' }, 'Follow', h)],
                h,
              ),
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
