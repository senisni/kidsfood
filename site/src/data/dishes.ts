import menu from './menu.json'
export interface Dish {
  id: string
  meal: 'B' | 'L' | 'D'
  title: string
  veg: string
  grain: string
  protein: string
  tags: string[]
  time: string
  how: string[]
  sprite: string | null
  img: string
}
export const dishes = menu as Dish[]
export const mealNames = { B: 'Завтрак', L: 'Обед', D: 'Ужин' } as const
export const dishHref = (dish: Dish) => `/menu/${dish.id.toLowerCase()}/`
