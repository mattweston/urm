import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '../../generated/registry/ui/button'
import { Empty } from '../../generated/registry/ui/empty'
import { icon } from '../../generated/registry/lib/icons'
import { ArrowUpRight, Folder, Plus, Search } from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

export const emptyView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          Empty<Message>(
            {},
            [
              Empty.header<Message>(
                {},
                [
                  Empty.title<Message>({}, ['No projects yet'], h),
                  Empty.description<Message>(
                    {},
                    [
                      "You haven't created any projects yet. Get started by creating your first project.",
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  h.div(
                    [h.Class('flex gap-2')],
                    [
                      button<Message>({}, 'Create project', h),
                      button<Message>({ variant: 'outline' }, 'Import project', h),
                    ],
                  ),
                  button<Message>(
                    { variant: 'link', className: 'text-muted-foreground' },
                    h.span(
                      [h.Class('inline-flex items-center gap-1')],
                      ['Learn more ', icon(h, ArrowUpRight, 'size-4')],
                    ),
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
            ['With Muted Background'],
          ),
          Empty<Message>(
            { className: 'bg-muted' },
            [
              Empty.header<Message>(
                {},
                [
                  Empty.title<Message>({}, ['No results found'], h),
                  Empty.description<Message>(
                    {},
                    ['No results found for your search. Try adjusting your search terms.'],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  button<Message>({}, 'Try again', h),
                  button<Message>(
                    { variant: 'link', className: 'text-muted-foreground' },
                    h.span(
                      [h.Class('inline-flex items-center gap-1')],
                      ['Learn more ', icon(h, ArrowUpRight, 'size-4')],
                    ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Border']),
          Empty<Message>(
            { className: 'border' },
            [
              Empty.header<Message>(
                {},
                [
                  Empty.title<Message>({}, ['404 - Not Found'], h),
                  Empty.description<Message>(
                    {},
                    [
                      "The page you're looking for doesn't exist. Try searching for what you need below.",
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  h.div(
                    [
                      h.Class(
                        'flex w-full max-w-sm items-center gap-2 rounded-lg border bg-background px-3 py-2',
                      ),
                    ],
                    [
                      icon(h, Search, 'size-4 text-muted-foreground'),
                      h.input([
                        h.Type('text'),
                        h.Placeholder('Try searching for pages...'),
                        h.Class(
                          'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                        ),
                      ]),
                      h.kbd(
                        [h.Class('ml-auto rounded border bg-muted px-1.5 py-0.5 text-xs')],
                        ['/'],
                      ),
                    ],
                  ),
                  Empty.description<Message>(
                    {},
                    [
                      h.span(
                        [],
                        [
                          'Need help? ',
                          h.a([h.Href('#'), h.Class('underline')], ['Contact support']),
                        ],
                      ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Icon']),
          Empty<Message>(
            { className: 'border' },
            [
              Empty.header<Message>(
                {},
                [
                  Empty.media<Message>({ variant: 'icon' }, [icon(h, Folder, 'size-4')], h),
                  Empty.title<Message>({}, ['Nothing to see here'], h),
                  Empty.description<Message>(
                    {},
                    [
                      h.span(
                        [],
                        [
                          'No posts have been created yet. Get started by ',
                          h.a([h.Href('#'), h.Class('underline')], ['creating your first post']),
                          '.',
                        ],
                      ),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  button<Message>(
                    { variant: 'outline' },
                    h.span(
                      [h.Class('inline-flex items-center gap-1.5')],
                      [icon(h, Plus, 'size-4'), 'New Post'],
                    ),
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
            ['With Muted Background Alt'],
          ),
          Empty<Message>(
            { className: 'bg-muted/50' },
            [
              Empty.header<Message>(
                {},
                [
                  Empty.title<Message>({}, ['404 - Not Found'], h),
                  Empty.description<Message>(
                    {},
                    [
                      "The page you're looking for doesn't exist. Try searching for what you need below.",
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  h.div(
                    [
                      h.Class(
                        'flex w-full max-w-sm items-center gap-2 rounded-lg border bg-background px-3 py-2',
                      ),
                    ],
                    [
                      icon(h, Search, 'size-4 text-muted-foreground'),
                      h.input([
                        h.Type('text'),
                        h.Placeholder('Try searching for pages...'),
                        h.Class(
                          'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                        ),
                      ]),
                      h.kbd(
                        [h.Class('ml-auto rounded border bg-muted px-1.5 py-0.5 text-xs')],
                        ['/'],
                      ),
                    ],
                  ),
                  Empty.description<Message>(
                    {},
                    [
                      h.span(
                        [],
                        [
                          'Need help? ',
                          h.a([h.Href('#'), h.Class('underline')], ['Contact support']),
                        ],
                      ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['In Card']),
          Empty<Message>(
            { className: 'border' },
            [
              Empty.header<Message>(
                {},
                [
                  Empty.media<Message>({ variant: 'icon' }, [icon(h, Folder, 'size-4')], h),
                  Empty.title<Message>({}, ['No projects yet'], h),
                  Empty.description<Message>(
                    {},
                    [
                      "You haven't created any projects yet. Get started by creating your first project.",
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Empty.content<Message>(
                {},
                [
                  h.div(
                    [h.Class('flex gap-2')],
                    [
                      button<Message>({}, 'Create project', h),
                      button<Message>({ variant: 'outline' }, 'Import project', h),
                    ],
                  ),
                  button<Message>(
                    { variant: 'link', className: 'text-muted-foreground' },
                    h.span(
                      [h.Class('inline-flex items-center gap-1')],
                      ['Learn more ', icon(h, ArrowUpRight, 'size-4')],
                    ),
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
    ],
  )

export const slice = defineSlice({
  fields: {},
  init: {},
  messages: [],
  handlers: () => ({}),
})
