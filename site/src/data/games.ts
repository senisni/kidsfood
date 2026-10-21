export interface Game {
  href: string
  title: string
  text: string
  sprites: string[]
  tone: string
}

// tone — фон подложки карточки (класс Tailwind целиком)
export const games: Game[] = [
  { href: '/games/plate.html', title: 'Собери тарелку', text: 'Завтрак, обед и ужин: кто в какую часть?', sprites: ['plate3-1', 'toast-1'], tone: 'bg-mint' },
  { href: '/games/fiber.html', title: 'Паровозик и сад', text: 'Где есть клетчатка, а где нет?', sprites: ['mic-2', 'girlact-5'], tone: 'bg-veg/50' },
  { href: '/games/lunchbox.html', title: 'Ланч-бокс для друга', text: 'Обед в школу по заказу: «не ем мясо», «нельзя орехи».', sprites: ['lbox-1', 'classgirl-4'], tone: 'bg-pink' },
  { href: '/games/dishes.html', title: 'Что в блюде?', text: 'Найди друзей в плове, супе и блинчиках.', sprites: ['el60-8', 'cook-2'], tone: 'bg-sand' },
  { href: '/games/myths.html', title: 'Правда или миф', text: '10 карточек: что верно о еде?', sprites: ['girlact-1'], tone: 'bg-[#c9a7d8]' },
  { href: '/games/tummy.html', title: 'Что говорит живот?', text: 'Голоден, сыт, хочется пить — как поступить?', sprites: ['boyact-5'], tone: 'bg-rose' },
  { href: '/games/snack.html', title: 'Собери перекус', text: 'Фрукт и ещё один друг. И попить.', sprites: ['snack-3', 'toast-6'], tone: 'bg-[#f3c98b]' },
]
