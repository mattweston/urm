import type { Html, HtmlBuilder } from 'foldkit/html'

import { Attachment, attachmentTriggerClass } from '../../generated/registry/ui/attachment'
import { icon } from '../../generated/registry/lib/icons'
import { spinner } from '../../generated/registry/ui/spinner'
import {
  Archive,
  Check,
  Clock,
  Copy,
  Download,
  FileArchive,
  FileCode,
  FileSearch,
  FileText,
  FileWarning,
  Presentation,
  RefreshCw,
  Table,
  X,
} from 'lucide'

import { defineSlice } from '../slice'
import type { Message, Model } from '../assemble'

const fileIcon = (h: HtmlBuilder<Message>, variant: string) => {
  switch (variant) {
    case 'csv':
      return icon(h, Table, 'size-5')
    case 'code':
      return icon(h, FileCode, 'size-5')
    case 'zip':
      return icon(h, FileArchive, 'size-5')
    case 'key':
      return icon(h, Presentation, 'size-5')
    case 'archive':
      return icon(h, Archive, 'size-5')
    default:
      return icon(h, FileText, 'size-5')
  }
}

const removeAction = (h: HtmlBuilder<Message>, label: string) =>
  Attachment.action<Message>(
    { attributes: [h.Attribute('aria-label', label)] },
    icon(h, X, 'size-3.5'),
    h,
  )

export const attachmentView = (_model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex w-full flex-col gap-8')],
    [
      h.div(
        [h.Class('flex w-full flex-col gap-2')],
        [
          h.div(
            [h.Class('px-1 text-xs font-medium text-muted-foreground')],
            ['Files — Horizontal'],
          ),
          h.div(
            [h.Class('flex flex-col gap-3')],
            [
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['sales-dashboard.pdf'], h),
                      Attachment.description<Message>({}, ['PDF · 2.4 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove sales-dashboard.pdf')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'csv')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['customer-import.csv'], h),
                      Attachment.description<Message>({}, ['CSV · 18 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove customer-import.csv')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'code')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['message-renderer.tsx'], h),
                      Attachment.description<Message>({}, ['TypeScript · 12 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove message-renderer.tsx')],
                    h,
                  ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Files — Vertical']),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['sales-dashboard.pdf'], h),
                      Attachment.description<Message>({}, ['PDF · 2.4 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove sales-dashboard.pdf')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'csv')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['customer-import.csv'], h),
                      Attachment.description<Message>({}, ['CSV · 18 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove customer-import.csv')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'code')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['message-renderer.tsx'], h),
                      Attachment.description<Message>({}, ['TypeScript · 12 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove message-renderer.tsx')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'zip')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['source-assets.zip'], h),
                      Attachment.description<Message>({}, ['ZIP · 4.2 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove source-assets.zip')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'key')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['quarterly-review.key'], h),
                      Attachment.description<Message>({}, ['Keynote · 9 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove quarterly-review.key')],
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Content Only']),
          h.div(
            [h.Class('flex flex-col gap-3')],
            [
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.content<Message>(
                    {},
                    [Attachment.title<Message>({}, ['React Documentation'], h)],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove React Documentation')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.content<Message>(
                    {},
                    [Attachment.title<Message>({}, ['Tailwind CSS'], h)],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove Tailwind CSS')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { size: 'sm', className: 'w-48' },
                [
                  Attachment.content<Message>(
                    {},
                    [Attachment.title<Message>({}, ['shadcn/ui'], h)],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href('https://ui.shadcn.com'),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noopener noreferrer'),
                      h.Attribute('aria-label', 'Open shadcn/ui'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col gap-3')],
            [
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['Building accessible components'], h),
                      Attachment.description<Message>({}, ['react.dev · 8 min read'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove Building accessible components')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['Utility-first CSS framework'], h),
                      Attachment.description<Message>({}, ['tailwindcss.com'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove Utility-first CSS framework')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { size: 'sm', className: 'w-full max-w-80' },
                [
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['Compound components in React'], h),
                      Attachment.description<Message>({}, ['ui.shadcn.com/docs'], h),
                    ],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href('https://ui.shadcn.com/docs'),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noopener noreferrer'),
                      h.Attribute('aria-label', 'Open Compound components in React'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-3')],
        [
          h.div(
            [h.Class('px-1 text-xs font-medium text-muted-foreground')],
            ['States — Horizontal'],
          ),
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              Attachment<Message>(
                { state: 'idle', className: 'w-full' },
                [
                  Attachment.media<Message>({}, [icon(h, Clock, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['selected-file.pdf'], h),
                      Attachment.description<Message>({}, ['Ready to upload'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove selected-file.pdf')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'uploading', className: 'w-full' },
                [
                  Attachment.media<Message>({}, [spinner<Message>({}, h)], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['design-system.zip'], h),
                      Attachment.description<Message>({}, ['Uploading · 64%'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove design-system.zip')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'processing', className: 'w-full' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['market-research.pdf'], h),
                      Attachment.description<Message>({}, ['Processing document'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove market-research.pdf')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'error', className: 'w-full' },
                [
                  Attachment.media<Message>({}, [icon(h, FileWarning, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['financial-model.xlsx'], h),
                      Attachment.description<Message>({}, ['Upload failed. Try again.'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [
                      Attachment.action<Message>(
                        { attributes: [h.Attribute('aria-label', 'Retry upload')] },
                        icon(h, RefreshCw, 'size-3.5'),
                        h,
                      ),
                      removeAction(h, 'Remove attachment'),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'done', className: 'w-full' },
                [
                  Attachment.media<Message>({}, [icon(h, Check, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['uploaded-report.pdf'], h),
                      Attachment.description<Message>({}, ['Uploaded · 1.8 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove uploaded-report.pdf')],
                    h,
                  ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['States — Vertical']),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { state: 'idle', orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [icon(h, Clock, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['selected-file.pdf'], h),
                      Attachment.description<Message>({}, ['Ready'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove selected-file.pdf')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'uploading', orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [spinner<Message>({}, h)], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['design-system.zip'], h),
                      Attachment.description<Message>({}, ['Uploading'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove design-system.zip')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'processing', orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['market-research.pdf'], h),
                      Attachment.description<Message>({}, ['Processing'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove market-research.pdf')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'error', orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [icon(h, FileWarning, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['financial-model.xlsx'], h),
                      Attachment.description<Message>({}, ['Failed'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [
                      Attachment.action<Message>(
                        { attributes: [h.Attribute('aria-label', 'Retry financial-model.xlsx')] },
                        icon(h, RefreshCw, 'size-3.5'),
                        h,
                      ),
                      removeAction(h, 'Remove financial-model.xlsx'),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'done', orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [icon(h, Check, 'size-5')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['uploaded-report.pdf'], h),
                      Attachment.description<Message>({}, ['Done'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove uploaded-report.pdf')],
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
        [h.Class('flex w-full flex-col gap-3')],
        [
          h.div(
            [h.Class('px-1 text-xs font-medium text-muted-foreground')],
            ['Images — Horizontal'],
          ),
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['PNG · 820 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open workspace.png'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Desk'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['desk-reference.jpg'], h),
                      Attachment.description<Message>({}, ['JPG · 1.1 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove desk-reference.jpg')],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open desk-reference.jpg'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['JPG · 940 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove office-reference.jpg')],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open office-reference.jpg'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
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
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Images — Vertical']),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['PNG · 820 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open workspace.png'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Desk'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['desk-reference.jpg'], h),
                      Attachment.description<Message>({}, ['JPG · 1.1 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove desk-reference.jpg')],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open desk-reference.jpg'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['JPG · 940 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove office-reference.jpg')],
                    h,
                  ),
                  h.a(
                    [
                      h.Class(attachmentTriggerClass),
                      h.Href(
                        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                      ),
                      h.Attribute('target', '_blank'),
                      h.Attribute('rel', 'noreferrer'),
                      h.Attribute('aria-label', 'Open office-reference.jpg'),
                      h.DataAttribute('slot', 'attachment-trigger'),
                    ],
                    [],
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
            ['Image States — Horizontal'],
          ),
          h.div(
            [h.Class('flex flex-col gap-2')],
            [
              Attachment<Message>(
                { state: 'idle', className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Ready to upload'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove office-reference.jpg')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'uploading', className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['Uploading · 72%'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'processing', className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Desk'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['desk-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Processing image'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove desk-reference.jpg')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'error', className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Upload failed'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [
                      Attachment.action<Message>(
                        { attributes: [h.Attribute('aria-label', 'Retry image upload')] },
                        icon(h, RefreshCw, 'size-3.5'),
                        h,
                      ),
                      removeAction(h, 'Remove attachment'),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'done', className: 'w-full' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['Uploaded · 1.2 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
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
          h.div(
            [h.Class('px-1 text-xs font-medium text-muted-foreground')],
            ['Image States — Vertical'],
          ),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { state: 'idle', orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Ready'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove office-reference.jpg')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'uploading', orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['Uploading'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'processing', orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Desk'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['desk-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Processing'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove desk-reference.jpg')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'error', orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office-reference.jpg'], h),
                      Attachment.description<Message>({}, ['Failed'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [
                      Attachment.action<Message>(
                        { attributes: [h.Attribute('aria-label', 'Retry office-reference.jpg')] },
                        icon(h, RefreshCw, 'size-3.5'),
                        h,
                      ),
                      removeAction(h, 'Remove office-reference.jpg'),
                    ],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { state: 'done', orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['Done'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                ],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-3')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Sizes']),
          Attachment<Message>(
            { size: 'default', className: 'w-full' },
            [
              Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
              Attachment.content<Message>(
                {},
                [
                  Attachment.title<Message>({}, ['Default attachment'], h),
                  Attachment.description<Message>({}, ['PDF · 2.4 MB'], h),
                ],
                h,
              ),
            ],
            h,
          ),
          Attachment<Message>(
            { size: 'sm', className: 'w-full' },
            [
              Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
              Attachment.content<Message>(
                {},
                [
                  Attachment.title<Message>({}, ['Small attachment'], h),
                  Attachment.description<Message>({}, ['PDF · 2.4 MB'], h),
                ],
                h,
              ),
            ],
            h,
          ),
          Attachment<Message>(
            { size: 'xs', className: 'w-full' },
            [
              Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
              Attachment.content<Message>(
                {},
                [Attachment.title<Message>({}, ['Extra small attachment'], h)],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-4')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Scrollable Group']),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { className: 'w-64' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['briefing-notes.pdf'], h),
                      Attachment.description<Message>({}, ['PDF · 1.4 MB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>(
                    {},
                    [removeAction(h, 'Remove briefing-notes.pdf')],
                    h,
                  ),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-64' },
                [
                  Attachment.media<Message>(
                    { variant: 'image' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Workspace'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['workspace.png'], h),
                      Attachment.description<Message>({}, ['PNG · 820 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove workspace.png')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-64' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'csv')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['customers.csv'], h),
                      Attachment.description<Message>({}, ['CSV · 18 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove customers.csv')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { className: 'w-64' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'code')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['renderer.tsx'], h),
                      Attachment.description<Message>({}, ['TSX · 12 KB'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove renderer.tsx')], h),
                ],
                h,
              ),
            ],
            h,
          ),
          Attachment.group<Message>(
            { className: 'w-full' },
            [
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['invoice.pdf'], h),
                      Attachment.description<Message>({}, ['PDF'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove invoice.pdf')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image', className: 'aspect-square w-full' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Desk'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['desk.jpg'], h),
                      Attachment.description<Message>({}, ['JPG'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove desk.jpg')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'zip')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['assets.zip'], h),
                      Attachment.description<Message>({}, ['ZIP'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove assets.zip')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>(
                    { variant: 'image', className: 'aspect-square w-full' },
                    [
                      h.img([
                        h.Src(
                          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80',
                        ),
                        h.Alt('Office'),
                      ]),
                    ],
                    h,
                  ),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['office.jpg'], h),
                      Attachment.description<Message>({}, ['JPG'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove office.jpg')], h),
                ],
                h,
              ),
              Attachment<Message>(
                { orientation: 'vertical' },
                [
                  Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
                  Attachment.content<Message>(
                    {},
                    [
                      Attachment.title<Message>({}, ['notes.pdf'], h),
                      Attachment.description<Message>({}, ['PDF'], h),
                    ],
                    h,
                  ),
                  Attachment.actions<Message>({}, [removeAction(h, 'Remove notes.pdf')], h),
                ],
                h,
              ),
            ],
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex w-full flex-col gap-3')],
        [
          h.div([h.Class('px-1 text-xs font-medium text-muted-foreground')], ['Triggers']),
          Attachment<Message>(
            { className: 'w-full' },
            [
              Attachment.media<Message>({}, [fileIcon(h, 'pdf')], h),
              Attachment.content<Message>(
                {},
                [
                  Attachment.title<Message>({}, ['contract-review.pdf'], h),
                  Attachment.description<Message>({}, ['PDF · 820 KB'], h),
                ],
                h,
              ),
              Attachment.actions<Message>(
                {},
                [
                  Attachment.action<Message>(
                    { attributes: [h.Attribute('aria-label', 'Download attachment')] },
                    icon(h, Download, 'size-3.5'),
                    h,
                  ),
                  removeAction(h, 'Remove attachment'),
                ],
                h,
              ),
              h.a(
                [
                  h.Class(attachmentTriggerClass),
                  h.Href('#'),
                  h.Attribute('target', '_blank'),
                  h.Attribute('rel', 'noreferrer'),
                  h.Attribute('aria-label', 'Open contract-review.pdf'),
                  h.DataAttribute('slot', 'attachment-trigger'),
                ],
                [],
              ),
            ],
            h,
          ),
          Attachment<Message>(
            { className: 'w-full' },
            [
              Attachment.media<Message>({}, [icon(h, FileSearch, 'size-5')], h),
              Attachment.content<Message>(
                {},
                [
                  Attachment.title<Message>({}, ['research-summary.pdf'], h),
                  Attachment.description<Message>({}, ['Open preview dialog'], h),
                ],
                h,
              ),
              Attachment.actions<Message>(
                {},
                [
                  Attachment.action<Message>(
                    { attributes: [h.Attribute('aria-label', 'Copy link')] },
                    icon(h, Copy, 'size-3.5'),
                    h,
                  ),
                  removeAction(h, 'Remove research-summary.pdf'),
                ],
                h,
              ),
              Attachment.trigger<Message>(
                { attributes: [h.Attribute('aria-label', 'Preview research-summary.pdf')] },
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
