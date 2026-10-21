import type { APIRoute } from 'astro'
import { dishes, dishHref } from '@/data/dishes'
import { videos } from '@/data/videos'
import { games } from '@/data/games'
import { absoluteUrl } from '@/lib/seo'
export const GET: APIRoute = () => {
  const paths = ['/', '/multfilmy/', '/igry/', '/menu/', '/o-proekte/', ...videos.map((video) => `/multfilmy/${video.id}/`), ...games.map((game) => game.href), ...dishes.map(dishHref)]
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${absoluteUrl(path)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
