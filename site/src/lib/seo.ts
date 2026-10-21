import type { Video } from '@/data/videos'

export const siteName = 'Три друга на тарелке'
export const siteUrl = 'https://kidsfood.insines.ru'
export const absoluteUrl = (path: string) => new URL(path, siteUrl).href
export const serializeSchema = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
export const breadcrumbSchema = (items: { name: string; href: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.href) })),
})
export const videoSchema = (video: Video) => ({
  '@type': 'VideoObject',
  '@id': absoluteUrl(`/multfilmy/${video.id}/#video`),
  name: video.title,
  description: video.text,
  thumbnailUrl: absoluteUrl(video.poster),
  uploadDate: '2026-10-21T10:04:00+03:00',
  duration: `PT${video.seconds}S`,
  contentUrl: absoluteUrl(video.src),
  inLanguage: 'ru',
  isAccessibleForFree: true,
})
