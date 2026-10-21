import type { FoodId } from './foods'

// Три друга тарелки — единый источник названий, цветов и примеров для всего сайта
export type FriendId = 'veg' | 'grain' | 'protein'

export interface Friend {
  id: FriendId
  name: string
  why: string
  share: string
  examples: string
  foods: FoodId[]
}

export const friends: Friend[] = [
  { id: 'veg', name: 'Овощи и фрукты', why: 'витамины и клетчатка', share: 'половина тарелки', examples: 'огурец, морковь, капуста, брокколи, яблоко, ягоды', foods: ['cucumber', 'carrot', 'apple'] },
  { id: 'grain', name: 'Крупы и хлеб', why: 'энергия: бегать и думать', share: 'четверть тарелки', examples: 'рис, гречка, овсянка, макароны, хлеб, картошка', foods: ['bread', 'buckwheat', 'potato'] },
  { id: 'protein', name: 'Белок', why: 'чтобы расти и крепнуть', share: 'четверть тарелки', examples: 'яйцо, творог, сыр, йогурт, рыба, мясо, фасоль', foods: ['egg', 'tvorog', 'fish'] },
]

export const friendById = (id: FriendId) => friends.find((friend) => friend.id === id) as Friend

// классы Tailwind по другу: Tailwind видит их целиком, поэтому не собираем строку на лету
export const friendTone: Record<FriendId, { text: string; bg: string; border: string; soft: string }> = {
  veg: { text: 'text-veg', bg: 'bg-veg', border: 'border-veg', soft: 'bg-veg/15' },
  grain: { text: 'text-grain', bg: 'bg-grain', border: 'border-grain', soft: 'bg-grain/15' },
  protein: { text: 'text-protein', bg: 'bg-protein', border: 'border-protein', soft: 'bg-protein/15' },
}
