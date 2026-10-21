export interface Video {
  id: string
  title: string
  length: string
  text: string
  src: string
  poster: string
}

export const videos: Video[] = [
  { id: 'film', title: 'Три друга на тарелке', length: '68 секунд', text: 'Главная мысль: на каждой тарелке три друга. Завтрак, школа, сад в животе, ужин.', src: '/media/three-friends.mp4', poster: '/media/three-friends.jpg' },
  { id: 'fiber', title: 'Сад в животе', length: '27 секунд', text: 'Что такое клетчатка, где она прячется и кто ею питается. Викторина в конце.', src: '/media/belly-garden.mp4', poster: '/media/belly-garden.jpg' },
  { id: 'dinner', title: 'Ужин: слушай живот', length: '26 секунд', text: 'Наелся — можно остановиться. Голоден — можно добавки.', src: '/media/dinner.mp4', poster: '/media/dinner.jpg' },
]
