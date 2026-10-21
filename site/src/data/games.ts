export interface Game {
  href: string
  title: string
  text: string
  sprites: string[]
  image: string
  tone: string
  accent: string
}

// image — вырезка из site-kit для карточки; sprites — герои и еда для метаданных игр
// tone — фон плитки, accent — цвет кнопки-стрелки (классы Tailwind целиком)
export const games: Game[] = [
  { href: '/games/plate.html', image: 'game-plate', title: 'Собери тарелку', text: 'Завтрак, обед и ужин: кто в какую часть?', sprites: ['plate3-1', 'toast-1'], tone: 'bg-[#f6d98a]', accent: 'bg-terracotta' },
  { href: '/games/fiber.html', image: 'game-fiber-garden', title: 'Найди клетчатку', text: 'Где есть клетчатка, а где нет?', sprites: ['mic-2', 'girlact-5'], tone: 'bg-[#d9ead0]', accent: 'bg-forest' },
  { href: '/games/lunchbox.html', image: 'game-lunchbox', title: 'Ланч-бокс для друга', text: 'Обед в школу по заказу: «не ем мясо», «нельзя орехи».', sprites: ['lbox-1', 'classgirl-4'], tone: 'bg-[#f8dcc2]', accent: 'bg-terracotta' },
  { href: '/games/dishes.html', image: 'game-dishes', title: 'Что в блюде?', text: 'Найди друзей в плове, супе и блинчиках.', sprites: ['el60-8', 'cook-2'], tone: 'bg-[#d5e9ec]', accent: 'bg-water' },
  { href: '/games/myths.html', image: 'game-myths', title: 'Правда или миф', text: '10 карточек: что верно о еде?', sprites: ['girlact-1'], tone: 'bg-[#f7e6b0]', accent: 'bg-grain' },
  { href: '/games/tummy.html', image: 'game-tummy', title: 'Что говорит живот?', text: 'Голоден, сыт, хочется пить — как поступить?', sprites: ['boyact-5'], tone: 'bg-[#dcebc6]', accent: 'bg-forest' },
  { href: '/games/snack.html', image: 'game-snack', title: 'Собери перекус', text: 'Фрукт и ещё один друг. И попить.', sprites: ['snack-3', 'toast-6'], tone: 'bg-[#f9dfcd]', accent: 'bg-water' },
]
