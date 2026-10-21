// Главные мысли для взрослых — сокращённо из docs/TALK-GUIDE.md и docs/FACT-CHECK.md
export interface Fact {
  title: string
  text: string
}

export const facts: Fact[] = [
  { title: 'Три друга на каждой тарелке', text: 'Половина — овощи и фрукты, четверть — крупы и хлеб, четверть — белок. И утром, и вечером.' },
  { title: '«Утром углеводы, вечером белок» — миф', text: 'Такого правила нет в рекомендациях. Белок нужен весь день, гарнир на ужин — нормально.' },
  { title: 'Клетчатка — только в растениях', text: 'Помогает еде двигаться по кишечнику и кормит полезных микробов. Про «выводит токсины» не говорим — доказательств нет.' },
  { title: 'Сладкое — иногда', text: 'Без запретов и стыда: понемногу, после основной еды, не как награда.' },
  { title: 'Пить — воду', text: 'Целый фрукт лучше сока: в нём есть клетчатка, и он дольше насыщает.' },
  { title: 'Сколько есть — решает ребёнок', text: 'Взрослый решает, что и когда предложить. Ребёнок — есть ли и сколько. Доедать необязательно.' },
]

export const sources = [
  { name: 'Canada’s Food Guide', href: 'https://food-guide.canada.ca/' },
  { name: 'MyPlate (USDA)', href: 'https://www.myplate.gov/' },
  { name: 'Harvard Healthy Eating Plate', href: 'https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/' },
  { name: 'ВОЗ: здоровое питание', href: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  { name: 'AAP: клетчатка у детей', href: 'https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Kids-Need-Fiber-Heres-Why-and-How.aspx' },
  { name: 'Ellyn Satter: разделение ответственности', href: 'https://www.ellynsatterinstitute.org/how-to-feed/the-division-of-responsibility-in-feeding/' },
]
