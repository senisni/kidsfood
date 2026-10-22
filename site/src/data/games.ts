export interface Game {
  slug: string
  legacy: string
  href: string
  title: string
  text: string
  sprites: string[]
  image: string
  tone: string
  accent: string
}

// slug — адрес /igry/<slug>/; legacy — имя старого файла /games/<legacy>.html (переадресация)
// image — вырезка из site-kit для карточки; sprites — герои и еда для метаданных игр
// tone — фон плитки, accent — цвет кнопки-стрелки (классы Tailwind целиком)
export const games: Game[] = [
  { slug: 'soberi-tarelku', legacy: 'plate', href: '/igry/soberi-tarelku/', image: 'game-plate', title: 'Собери тарелку', text: 'Завтрак, обед и ужин: кто в какую часть?', sprites: ['plate3-1', 'toast-1'], tone: 'bg-[#f6d98a]', accent: 'bg-terracotta' },
  { slug: 'naydi-kletchatku', legacy: 'fiber', href: '/igry/naydi-kletchatku/', image: 'game-fiber-garden', title: 'Найди клетчатку', text: 'Где есть клетчатка, а где нет?', sprites: ['mic-2', 'girlact-5'], tone: 'bg-[#d9ead0]', accent: 'bg-forest' },
  { slug: 'lanch-boks', legacy: 'lunchbox', href: '/igry/lanch-boks/', image: 'game-lunchbox', title: 'Ланч-бокс для друга', text: 'Обед в школу по заказу: «не ем мясо», «нельзя орехи».', sprites: ['lbox-1', 'classgirl-4'], tone: 'bg-[#f8dcc2]', accent: 'bg-terracotta' },
  { slug: 'chto-v-blyude', legacy: 'dishes', href: '/igry/chto-v-blyude/', image: 'game-dishes', title: 'Что в блюде?', text: 'Найди друзей в плове, супе и блинчиках.', sprites: ['el60-8', 'cook-2'], tone: 'bg-[#d5e9ec]', accent: 'bg-water' },
  { slug: 'pravda-ili-mif', legacy: 'myths', href: '/igry/pravda-ili-mif/', image: 'game-myths', title: 'Правда или миф', text: '10 карточек: что верно о еде?', sprites: ['girlact-1'], tone: 'bg-[#f7e6b0]', accent: 'bg-grain' },
  { slug: 'chto-govorit-zhivot', legacy: 'tummy', href: '/igry/chto-govorit-zhivot/', image: 'game-tummy', title: 'Что говорит живот?', text: 'Голоден, сыт, хочется пить — как поступить?', sprites: ['boyact-5'], tone: 'bg-[#dcebc6]', accent: 'bg-forest' },
  { slug: 'soberi-perekus', legacy: 'snack', href: '/igry/soberi-perekus/', image: 'game-snack', title: 'Собери перекус', text: 'Фрукт и ещё один друг. И попить.', sprites: ['snack-3', 'toast-6'], tone: 'bg-[#f9dfcd]', accent: 'bg-water' },
]

export const gameBySlug = (slug: string) => {
  const game = games.find((item) => item.slug === slug)
  if (!game) throw new Error(`Нет игры «${slug}» в data/games.ts`)
  return game
}
