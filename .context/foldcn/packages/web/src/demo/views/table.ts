import type { Html, HtmlBuilder } from 'foldkit/html'

import { Table } from '../../generated/registry/ui/table'
import { icon } from '../../generated/registry/lib/icons'
import { MoreHorizontal } from 'lucide'

import { Schema as S } from 'effect'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

const invoices = [
  {
    invoice: 'INV001',
    paymentStatus: 'Paid',
    totalAmount: '$250.00',
    paymentMethod: 'Credit Card',
  },
  { invoice: 'INV002', paymentStatus: 'Pending', totalAmount: '$150.00', paymentMethod: 'PayPal' },
  {
    invoice: 'INV003',
    paymentStatus: 'Unpaid',
    totalAmount: '$350.00',
    paymentMethod: 'Bank Transfer',
  },
]

const people = [
  { name: 'Sarah Chen', email: 'sarah.chen@acme.com', role: 'Admin' },
  { name: 'Marc Rodriguez', email: 'marcus.rodriguez@acme.com', role: 'User' },
  { name: 'Emily Watson', email: 'emily.watson@acme.com', role: 'User' },
]

const badge = (label: string, color: string) =>
  `inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`

const tableBasic = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.caption({}, ['A list of your recent invoices.'], h),
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({ className: 'w-[100px]' }, ['Invoice'], h),
              Table.head({}, ['Status'], h),
              Table.head({}, ['Method'], h),
              Table.head({ className: 'text-right' }, ['Amount'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        invoices.map((inv) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [inv.invoice], h),
              Table.cell({}, [inv.paymentStatus], h),
              Table.cell({}, [inv.paymentMethod], h),
              Table.cell({ className: 'text-right' }, [inv.totalAmount], h),
            ],
            h,
          ),
        ),
        h,
      ),
    ],
    h,
  )

const tableWithFooter = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.caption({}, ['A list of your recent invoices.'], h),
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({ className: 'w-[100px]' }, ['Invoice'], h),
              Table.head({}, ['Status'], h),
              Table.head({}, ['Method'], h),
              Table.head({ className: 'text-right' }, ['Amount'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        invoices.map((inv) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [inv.invoice], h),
              Table.cell({}, [inv.paymentStatus], h),
              Table.cell({}, [inv.paymentMethod], h),
              Table.cell({ className: 'text-right' }, [inv.totalAmount], h),
            ],
            h,
          ),
        ),
        h,
      ),
      Table.footer(
        {},
        [
          Table.row(
            {},
            [
              h.td(
                [h.Class('cn-table-cell'), h.DataAttribute('slot', 'table-cell'), h.Colspan(3)],
                ['Total'],
              ),
              Table.cell({ className: 'text-right' }, ['$2,500.00'], h),
            ],
            h,
          ),
        ],
        h,
      ),
    ],
    h,
  )

const tableSimple = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({}, ['Name'], h),
              Table.head({}, ['Email'], h),
              Table.head({ className: 'text-right' }, ['Role'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        people.map((p) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [p.name], h),
              Table.cell({}, [p.email], h),
              Table.cell({ className: 'text-right' }, [p.role], h),
            ],
            h,
          ),
        ),
        h,
      ),
    ],
    h,
  )

const tableWithBadges = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({}, ['Task'], h),
              Table.head({}, ['Status'], h),
              Table.head({ className: 'text-right' }, ['Priority'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        [
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, ['Design homepage'], h),
              Table.cell(
                {},
                [
                  h.span(
                    [
                      h.Class(
                        badge('Completed', 'bg-green-500/10 text-green-700 dark:text-green-400'),
                      ),
                    ],
                    ['Completed'],
                  ),
                ],
                h,
              ),
              Table.cell(
                { className: 'text-right' },
                [
                  h.span(
                    [h.Class(badge('High', 'bg-blue-500/10 text-blue-700 dark:text-blue-400'))],
                    ['High'],
                  ),
                ],
                h,
              ),
            ],
            h,
          ),
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, ['Implement API'], h),
              Table.cell(
                {},
                [
                  h.span(
                    [
                      h.Class(
                        badge(
                          'In Progress',
                          'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                        ),
                      ),
                    ],
                    ['In Progress'],
                  ),
                ],
                h,
              ),
              Table.cell(
                { className: 'text-right' },
                [
                  h.span(
                    [h.Class(badge('Medium', 'bg-gray-500/10 text-gray-700 dark:text-gray-400'))],
                    ['Medium'],
                  ),
                ],
                h,
              ),
            ],
            h,
          ),
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, ['Write tests'], h),
              Table.cell(
                {},
                [
                  h.span(
                    [h.Class(badge('Pending', 'bg-gray-500/10 text-gray-700 dark:text-gray-400'))],
                    ['Pending'],
                  ),
                ],
                h,
              ),
              Table.cell(
                { className: 'text-right' },
                [
                  h.span(
                    [h.Class(badge('Low', 'bg-gray-500/10 text-gray-700 dark:text-gray-400'))],
                    ['Low'],
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
    h,
  )

const tableWithActions = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({}, ['Product'], h),
              Table.head({}, ['Price'], h),
              Table.head({ className: 'text-right' }, ['Actions'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        [
          ['Wireless Mouse', '$29.99'] as const,
          ['Mechanical Keyboard', '$129.99'] as const,
          ['USB-C Hub', '$49.99'] as const,
        ].map(([name, price]) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [name], h),
              Table.cell({}, [price], h),
              Table.cell(
                { className: 'text-right' },
                [
                  h.button(
                    [
                      h.Class(
                        'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent',
                      ),
                      h.AriaLabel('Open menu'),
                    ],
                    [icon(h, MoreHorizontal, 'size-4')],
                  ),
                ],
                h,
              ),
            ],
            h,
          ),
        ),
        h,
      ),
    ],
    h,
  )

const tasks = [
  { task: 'Design homepage', assignee: 'Sarah Chen', status: 'In Progress' },
  { task: 'Implement API', assignee: 'Marc Rodriguez', status: 'Pending' },
  { task: 'Write tests', assignee: 'Emily Watson', status: 'Not Started' },
]

const tableWithSelect = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({}, ['Task'], h),
              Table.head({}, ['Assignee'], h),
              Table.head({}, ['Status'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        tasks.map((item) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [item.task], h),
              Table.cell(
                {},
                [
                  h.select(
                    [
                      h.Class(
                        'flex h-8 w-40 rounded-md border border-input bg-transparent px-2 text-sm',
                      ),
                    ],
                    [h.option([h.Value(item.assignee)], [item.assignee])],
                  ),
                ],
                h,
              ),
              Table.cell({}, [item.status], h),
            ],
            h,
          ),
        ),
        h,
      ),
    ],
    h,
  )

const tableWithInput = (h: HtmlBuilder<Message>): Html =>
  Table(
    {},
    [
      Table.header(
        {},
        [
          Table.row(
            {},
            [
              Table.head({}, ['Product'], h),
              Table.head({}, ['Quantity'], h),
              Table.head({}, ['Price'], h),
            ],
            h,
          ),
        ],
        h,
      ),
      Table.body(
        {},
        [
          ['Wireless Mouse', '1', '$29.99'] as const,
          ['Mechanical Keyboard', '2', '$129.99'] as const,
          ['USB-C Hub', '1', '$49.99'] as const,
        ].map(([name, qty, price]) =>
          Table.row(
            {},
            [
              Table.cell({ className: 'font-medium' }, [name], h),
              Table.cell(
                {},
                [
                  h.input([
                    h.Type('number'),
                    h.Class(
                      'flex h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm',
                    ),
                    h.Attribute('value', qty),
                    h.Attribute('min', '0'),
                  ]),
                ],
                h,
              ),
              Table.cell({}, [price], h),
            ],
            h,
          ),
        ),
        h,
      ),
    ],
    h,
  )

export const tableView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Basic']),
          tableBasic(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Footer']),
          tableWithFooter(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Simple']),
          tableSimple(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Badges']),
          tableWithBadges(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Actions']),
          tableWithActions(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Select']),
          tableWithSelect(h),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['With Input']),
          tableWithInput(h),
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
