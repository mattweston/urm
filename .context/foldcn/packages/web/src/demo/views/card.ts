import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '../../generated/registry/ui/button'
import { Card } from '../../generated/registry/ui/card'
import { inputClass } from '../../generated/registry/ui/input'
import { icon } from '../../generated/registry/lib/icons'
import { Plus, Captions } from 'lucide'

import { Schema as S } from 'effect'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const cardView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Default Size']),
          Card<Message>(
            { size: 'default', className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Default Card'], h),
                  Card.description<Message>({}, ['This card uses the default size variant.'], h),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.p(
                    [],
                    [
                      'The card component supports a size prop that defaults to "default" for standard spacing.',
                    ],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                {},
                [button<Message>({ variant: 'outline', className: 'w-full' }, 'Action', h)],
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Small Size']),
          Card<Message>(
            { size: 'sm', className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Small Card'], h),
                  Card.description<Message>({}, ['This card uses the small size variant.'], h),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.p(
                    [],
                    [
                      'The card component supports a size prop that can be set to "sm" for a more compact appearance.',
                    ],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                {},
                [
                  button<Message>(
                    { variant: 'outline', size: 'sm', className: 'w-full' },
                    'Action',
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
            ['Content Edge to Edge'],
          ),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Terms of Service'], h),
                  Card.description<Message>({}, ['Review the terms before accepting.'], h),
                ],
                h,
              ),
              Card.content<Message>(
                { className: '-mb-(--card-spacing) px-0' },
                [
                  h.div(
                    [
                      h.Class(
                        'max-h-48 space-y-4 overflow-y-scroll border-t bg-muted/50 px-(--card-spacing) py-4 text-sm leading-relaxed',
                      ),
                    ],
                    [
                      h.p(
                        [],
                        [
                          'These terms govern your use of the workspace, including access to shared documents.',
                        ],
                      ),
                      h.p([], ['You are responsible for the content you upload and permissions.']),
                      h.p([], ['We may update features or limits as the service evolves.']),
                    ],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                { className: 'justify-end gap-2' },
                [
                  button<Message>({ variant: 'outline' }, 'Decline', h),
                  button<Message>({}, 'Accept', h),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Custom Spacing']),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm [--card-spacing:--spacing(6)]' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Release Health'], h),
                  Card.description<Message>({}, ['Track readiness across launch signals.'], h),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.div(
                    [h.Class('grid gap-2 rounded-lg bg-muted/50 p-3 text-sm')],
                    [
                      h.div(
                        [h.Class('flex items-center justify-between')],
                        [
                          h.span([h.Class('text-muted-foreground')], ['Checks passed']),
                          h.span([h.Class('font-medium')], ['24 / 26']),
                        ],
                      ),
                      h.div(
                        [h.Class('flex items-center justify-between')],
                        [
                          h.span([h.Class('text-muted-foreground')], ['Open blockers']),
                          h.span([h.Class('font-medium')], ['2']),
                        ],
                      ),
                    ],
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
            ['Header with Border'],
          ),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                { className: 'border-b' },
                [
                  Card.title<Message>({}, ['Header with Border'], h),
                  Card.description<Message>(
                    {},
                    ['This is a card with a header that has a bottom border.'],
                    h,
                  ),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.p(
                    [],
                    ['The header has a border-b class applied, creating a visual separation.'],
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
            ['Footer with Border'],
          ),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm' },
            [
              Card.content<Message>(
                {},
                [
                  h.p(
                    [],
                    ['The footer has a border-t class applied, creating a visual separation.'],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                { className: 'border-t' },
                [
                  button<Message>(
                    { variant: 'outline', className: 'w-full' },
                    'Footer with Border',
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
            ['Header with Border (Small)'],
          ),
          Card<Message>(
            { size: 'sm', className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                { className: 'border-b' },
                [
                  Card.title<Message>({}, ['Header with Border'], h),
                  Card.description<Message>(
                    {},
                    ['This is a small card with a header that has a bottom border.'],
                    h,
                  ),
                ],
                h,
              ),
              Card.content<Message>({}, [h.p([], ['The header has a border-b class applied.'])], h),
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
            ['Footer with Border (Small)'],
          ),
          Card<Message>(
            { size: 'sm', className: 'mx-auto w-full max-w-sm' },
            [
              Card.content<Message>({}, [h.p([], ['The footer has a border-t class applied.'])], h),
              Card.footer<Message>(
                { className: 'border-t' },
                [
                  button<Message>(
                    { variant: 'outline', size: 'sm', className: 'w-full' },
                    'Footer with Border',
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Image']),
          Card<Message>(
            { className: 'relative mx-auto w-full max-w-sm pt-0' },
            [
              h.img([
                h.Src(
                  'https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=800&auto=format&fit=crop',
                ),
                h.Alt('Landscape'),
                h.Class('aspect-video w-full object-cover'),
              ]),
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Beautiful Landscape'], h),
                  Card.description<Message>(
                    {},
                    ['A stunning view that captures the essence of natural beauty.'],
                    h,
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                {},
                [
                  button<Message>(
                    { className: 'w-full' },
                    h.span([], [icon(h, Plus, 'size-4'), ' Button']),
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
            ['With Image (Small)'],
          ),
          Card<Message>(
            { size: 'sm', className: 'relative mx-auto w-full max-w-sm pt-0' },
            [
              h.img([
                h.Src(
                  'https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=800&auto=format&fit=crop',
                ),
                h.Alt('Landscape'),
                h.Class('aspect-video w-full object-cover'),
              ]),
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Beautiful Landscape'], h),
                  Card.description<Message>(
                    {},
                    ['A stunning view that captures the essence of natural beauty.'],
                    h,
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                {},
                [
                  button<Message>(
                    { size: 'sm', className: 'w-full' },
                    h.span([], [icon(h, Plus, 'size-4'), ' Button']),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Login']),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Login to your account'], h),
                  Card.description<Message>(
                    {},
                    ['Enter your email below to login to your account'],
                    h,
                  ),
                  Card.action<Message>({}, [button<Message>({ variant: 'link' }, 'Sign Up', h)], h),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.div(
                    [h.Class('flex flex-col gap-6')],
                    [
                      h.div(
                        [h.Class('grid gap-2')],
                        [
                          h.label([h.For('email'), h.Class('text-sm font-medium')], ['Email']),
                          h.input([
                            h.Id('email'),
                            h.Type('email'),
                            h.Placeholder('m@example.com'),
                            h.Class(inputClass),
                          ]),
                        ],
                      ),
                      h.div(
                        [h.Class('grid gap-2')],
                        [
                          h.label(
                            [h.For('password'), h.Class('text-sm font-medium')],
                            ['Password'],
                          ),
                          h.input([h.Id('password'), h.Type('password'), h.Class(inputClass)]),
                        ],
                      ),
                    ],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                { className: 'flex-col gap-2' },
                [
                  button<Message>({ className: 'w-full' }, 'Login', h),
                  button<Message>(
                    { variant: 'outline', className: 'w-full' },
                    'Login with Google',
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Meeting Notes']),
          Card<Message>(
            { className: 'mx-auto w-full max-w-sm' },
            [
              Card.header<Message>(
                {},
                [
                  Card.title<Message>({}, ['Meeting Notes'], h),
                  Card.description<Message>(
                    {},
                    ['Transcript from the meeting with the client.'],
                    h,
                  ),
                  Card.action<Message>(
                    {},
                    [
                      button<Message>(
                        { variant: 'outline', size: 'sm' },
                        h.span([], [icon(h, Captions, 'size-4'), ' Transcribe']),
                        h,
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Card.content<Message>(
                {},
                [
                  h.p(
                    [],
                    ['Client requested dashboard redesign with focus on mobile responsiveness.'],
                  ),
                  h.ol(
                    [h.Class('mt-4 flex list-decimal flex-col gap-2 pl-6')],
                    [
                      h.li([], ['New analytics widgets']),
                      h.li([], ['Simplified navigation menu']),
                      h.li([], ['Dark mode support']),
                      h.li([], ['Timeline: 6 weeks']),
                    ],
                  ),
                ],
                h,
              ),
              Card.footer<Message>(
                {},
                [h.div([h.Class('text-xs text-muted-foreground')], ['3 participants'])],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
    ],
  )

const fields = {}
const stateSchema = S.Struct(fields)
type State = typeof stateSchema.Type

export const slice = defineSlice({
  fields,
  init: {},
  messages: [],
  handlers: (_model: State) => ({}),
})
