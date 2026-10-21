import type { FriendId } from './friends'

// Еда-вырезки: ключ → спрайт и друг. Используется в тарелке, карточках друзей и hero.
export interface Food {
  name: string
  sprite: string
  friend: FriendId
}

export const foods = {
  cucumber: { name: 'огурец', sprite: 'pfood-1', friend: 'veg' },
  apple: { name: 'яблоко', sprite: 'pfood-2', friend: 'veg' },
  broccoli: { name: 'брокколи', sprite: 'pfood-9', friend: 'veg' },
  carrot: { name: 'морковь', sprite: 'pfood-10', friend: 'veg' },
  tomato: { name: 'помидор', sprite: 'el20-5', friend: 'veg' },
  bread: { name: 'хлеб', sprite: 'pfood-3', friend: 'grain' },
  buckwheat: { name: 'гречка', sprite: 'pfood-6', friend: 'grain' },
  potato: { name: 'картошка', sprite: 'pfood-8', friend: 'grain' },
  egg: { name: 'яйцо', sprite: 'pfood-4', friend: 'protein' },
  tvorog: { name: 'творог', sprite: 'pfood-5', friend: 'protein' },
  fish: { name: 'рыба', sprite: 'pfood-7', friend: 'protein' },
  water: { name: 'вода', sprite: 'el10-6', friend: 'veg' },
} satisfies Record<string, Food>

export type FoodId = keyof typeof foods
