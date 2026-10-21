import type { Html, HtmlBuilder } from 'foldkit/html'

type Child = Html | string

import { button } from '@/components/ui/button'
import { input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const tableClass = 'w-full caption-bottom text-sm'

export const tableHeaderClass = '[&_tr]:border-b [&_tr]:border-border'

export const tableBodyClass = '[&_tr:last-child]:border-0'

export const tableRowClass =
  'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'

export const tableHeadClass = 'h-10 px-2 text-left align-middle font-medium text-muted-foreground'

export const tableCellClass = 'p-2 align-middle'

export type DataTableColumn = Readonly<{
  key: string
  title: string
  align?: 'left' | 'right'
}>

export type DataTableRow = Readonly<{
  id: string
  cells: Readonly<Record<string, Child>>
}>

export type DataTableConfig<M> = Readonly<{
  columns: ReadonlyArray<DataTableColumn>
  rows: ReadonlyArray<DataTableRow>
  searchValue?: string
  onSearchInput?: (value: string) => M
  onRowClick?: (rowId: string) => M
  className?: string
}>

/** Data table block: search input + styled table composed from foldcn
 *  primitives. Pagination and sorting are left to the consumer's update. */
export const dataTable = <M>(config: DataTableConfig<M>, h: HtmlBuilder<M>): Html =>
  h.div(
    [h.Class('w-full')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-4 py-4')],
        [
          input<M>(
            {
              id: 'data-table-search',
              label: 'Search',
              value: config.searchValue ?? '',
              onInput: config.onSearchInput,
              placeholder: 'Filter rows...',
              wrapperClass: 'max-w-sm',
            },
            h,
          ),
          button<M>({ variant: 'outline', size: 'sm' }, 'Export', h),
        ],
      ),
      h.div(
        [h.Class('overflow-hidden rounded-md border border-border')],
        [
          h.div(
            [h.Class('relative w-full overflow-auto')],
            [
              h.table(
                [h.Class(tableClass)],
                [
                  h.thead(
                    [h.Class(tableHeaderClass)],
                    [
                      h.tr(
                        [],
                        config.columns.map((column) =>
                          h.th(
                            [
                              h.Class(
                                cn(tableHeadClass, column.align === 'right' ? 'text-right' : ''),
                              ),
                            ],
                            [column.title],
                          ),
                        ),
                      ),
                    ],
                  ),
                  h.tbody(
                    [h.Class(tableBodyClass)],
                    config.rows.map((row) =>
                      h.tr(
                        [
                          h.Class(tableRowClass),
                          ...(config.onRowClick === undefined
                            ? []
                            : [h.OnClick(config.onRowClick(row.id))]),
                        ],
                        config.columns.map((column) =>
                          h.td(
                            [
                              h.Class(
                                cn(tableCellClass, column.align === 'right' ? 'text-right' : ''),
                              ),
                            ],
                            [row.cells[column.key] ?? ''],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
