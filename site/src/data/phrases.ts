// Реплики героев — в одном месте, чтобы тексты сайта и роликов совпадали
export type Speaker = 'boy' | 'girl'

export interface Phrase {
  who: Speaker
  text: string
}

export const phrases = {
  heroBoy: { who: 'boy', text: 'Мне хватит тоста!' },
  heroGirl: { who: 'girl', text: 'Тосту скучно одному!' },
  question: { who: 'girl', text: 'Кого не хватает на тарелке?' },
  allThree: { who: 'boy', text: 'Все три друга!' },
  full: { who: 'girl', text: 'Я наелась. Спасибо!' },
  games: { who: 'boy', text: 'Ошибаться можно — я подскажу!' },
  menu: { who: 'girl', text: 'Готовим вместе по выходным!' },
} satisfies Record<string, Phrase>

export const speakerFace: Record<Speaker, string> = { boy: 'heads-1', girl: 'heads-5' }
