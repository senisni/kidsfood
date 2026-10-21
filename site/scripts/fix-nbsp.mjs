#!/usr/bin/env node
/**
 * Codemod: неразрывные пробелы и дефисы в русском тексте.
 *
 * По правилу AGENTS.md (Typography): вставляются символы U+00A0 и U+2011, не HTML-сущности.
 * Существующие `&nbsp;` и смешанные последовательности обычных/неразрывных пробелов
 * нормализуются в один U+00A0 во всём обрабатываемом тексте.
 * Замена идемпотентна — повторный запуск ничего не меняет.
 * Комментарии пропускаются — строчные, блочные и HTML: типографика в них ничего
 * не переносит, а правки шумят в диффе.
 *
 * Запуск (pnpm fix-nbsp = node scripts/fix-nbsp.mjs):
 *   pnpm fix-nbsp                          # без аргументов в терминале — спросит путь и режим
 *   pnpm fix-nbsp sale                  # имя проекта (ищется в apps/, можно частично)
 *   pnpm fix-nbsp apps/help.foxford.ru     # путь до проекта/папки
 *   pnpm fix-nbsp src/foo.astro src/a.ts   # конкретные файлы
 *   pnpm fix-nbsp --check [target]         # dry-run, exit 1 если есть что фиксить
 *   pnpm fix-nbsp --lint [target]          # только отчёт: длинные цепочки NBSP, ничего не пишет
 *   pnpm fix-nbsp --unglue [target]        # плюс удалить лишние NBSP из длинных цепочек
 *   pnpm fix-nbsp --lint --max-len=20 ...  # порог длины цепочки (по умолчанию 26 символов)
 */
import fs from 'node:fs'
import path from 'node:path'
import { clearScreenDown, cursorTo, emitKeypressEvents, moveCursor } from 'node:readline'
import readline from 'node:readline/promises'
import { glob } from 'glob'

// Через код-поинт, а не литералом: невидимый символ в исходнике легко потерять при копировании.
const NBSP = String.fromCharCode(0x00a0)
const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011)
const NBSP_SEQUENCE_REGEX = new RegExp(`(?: |${NBSP})*${NBSP}(?: |${NBSP})*`, 'g')
// Дефис внутри слова с русской частью. Неразрывным он становится, только если перенос по нему
// выглядит плохо: одна из частей короткая (`ИТ‑колледж`, `из‑за`, `топ‑10`, `7‑дневный`), это
// частица или приставка (`что‑то`, `кое‑что`) или часть из списка ниже (`онлайн‑школа`).
// В длинных парах (`Художник-мультипликатор`, `преподаватели-практики`) остаётся обычный
// дефис — там перенос допустим. Чистые диапазоны (`1-4`) не трогаем: там нужен знак `–`.
// Список частей пополняется по мере надобности.
const SHORT_HYPHEN_PART_LENGTH = 3
// prettier-ignore
const NON_BREAKING_HYPHEN_PREFIXES = ['кое', 'онлайн', 'мастер', 'топ']
// prettier-ignore
const NON_BREAKING_HYPHEN_SUFFIXES = ['то', 'либо', 'нибудь', 'ка', 'таки', 'де']
const HYPHEN_BETWEEN_WORDS_REGEX = new RegExp(`([\\p{L}\\p{N}]+)[-${NON_BREAKING_HYPHEN}](?=([\\p{L}\\p{N}]+))`, 'gu')
const needsNonBreakingHyphen = (left, right) => {
  const isShort = (part) => part.length <= SHORT_HYPHEN_PART_LENGTH || /^\p{N}+$/u.test(part)
  return (
    isShort(left) ||
    isShort(right) ||
    NON_BREAKING_HYPHEN_PREFIXES.includes(left.toLowerCase()) ||
    NON_BREAKING_HYPHEN_SUFFIXES.includes(right.toLowerCase())
  )
}
// Дефис с пробелами между словами — это тире: «успех - вдохновить» → «успех — вдохновить». Слева от тире
// неразрывный пробел: строка не должна начинаться с тире. Рядом нужна кириллица: вычитание в коде
// (`width - offset`) — латиница, а у диапазона из цифр (`5 - 9`) свой знак `–`.
const DASH = String.fromCharCode(0x2014)
const HYPHEN_AS_DASH_REGEX = new RegExp(`([\\p{L}\\p{N}])[ ${NBSP}]+-[ ${NBSP}]+(?=([\\p{L}\\p{N}]))`, 'gu')
// Неразрывный дефис нельзя подставлять в URL, slug, id и другие технические значения: адрес
// `/онлайн-школа` после такой типографики перестанет совпадать с роутом.
const TECHNICAL_STRING_PATTERNS = [
  /\b(?:class(?::list)?|id|data-[\w-]+|href|src|action|for|name|value|slot)\s*=\s*(['"])(?:\\.|(?!\1).)*\1/g,
  /\b(?:id|slug|url|href|src|path|route|from|to|key|code)\s*:\s*(['"`])(?:\\.|(?!\1).)*\1/g,
  /(['"`])(?:https?:\/\/|\/|#|mailto:|tel:)(?:\\.|(?!\1).)*\1/g,
]

// Список предлогов/союзов из AGENTS.md → Typography
// prettier-ignore
const WORDS = [
  'в', 'во', 'к', 'с', 'со', 'о', 'об', 'у', 'а', 'и', 'по', 'на', 'не', 'за', 'из', 'от', 'до',
  'под', 'над', 'но', 'да', 'же', 'бы', 'ли', 'то',
  'для', 'без', 'при', 'про', 'чем', 'тем', 'вам',
]

// Перед словом: не буква/цифра/дефис (чтобы не матчить конец другого слова и «как-то»).
// Дефис любой: после первого прогона в «как-то» уже неразрывный, и без него повторный прогон
// принял бы «то» за отдельное слово и склеил его со следующим.
// После слова: одна или несколько комбинаций обычного пробела, &nbsp; и U+00A0.
// Дальше должно идти русское слово или цифра. Перенос строки не матчим, чтобы не склеивать строки.
const REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}${NON_BREAKING_HYPHEN}-])(${WORDS.join('|')})(?:(?: |&nbsp;|${NBSP})+)(?=[А-Яа-яёЁ0-9])`,
  'giu'
)

// Литеральные экранированные последовательности ` `, `‑` и т.п. В шаблонных
// атрибутах Astro (`title='... ...'`) они НЕ интерпретируются и рендерятся как есть.
// Заменяем на сам типографский символ — это идемпотентно и совпадает с политикой AGENTS.md
// (в data-строках/frontmatter значение при этом не меняется, только исходник нормализуется).
// Не трогаем двойной бэкслеш (`\\u00a0`) и произвольные кодовые escape в коде — только типографику.
const TYPO_ESCAPES = '00a0|00ad|2009|2011|2013|2014|2019|2022|202f'
const ESCAPE_REGEX = new RegExp(`(?<!\\\\)\\\\u(${TYPO_ESCAPES})`, 'gi')
const unescapeTypo = (s) => s.replace(ESCAPE_REGEX, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
// SEO-атрибуты BaseLayout не участвуют в переносах на странице. Открывающий тег может быть
// многострочным и содержать выражения, поэтому ищем его конец с учётом строк и фигурных скобок.
const getBaseLayoutRanges = (content) => {
  const ranges = []
  const opening = '<BaseLayout'
  let searchStart = 0

  while (searchStart < content.length) {
    const start = content.indexOf(opening, searchStart)
    if (start === -1) break

    const nextCharacter = content[start + opening.length]
    if (nextCharacter && !/[\s/>]/.test(nextCharacter)) {
      searchStart = start + opening.length
      continue
    }

    let quote = null
    let braceDepth = 0
    let escaped = false

    for (let index = start + opening.length; index < content.length; index++) {
      const character = content[index]

      if (quote) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === quote) quote = null
        continue
      }
      if (character === "'" || character === '"' || character === '`') quote = character
      else if (character === '{') braceDepth += 1
      else if (character === '}') braceDepth = Math.max(0, braceDepth - 1)
      else if (character === '>' && braceDepth === 0) {
        ranges.push({ end: index + 1, start })
        searchStart = index + 1
        break
      }

      if (index === content.length - 1) searchStart = content.length
    }
  }

  return ranges
}
const mergeRanges = (ranges) => {
  const merged = []

  for (const range of [...ranges].sort((left, right) => left.start - right.start)) {
    const previousRange = merged.at(-1)

    if (previousRange && range.start <= previousRange.end) previousRange.end = Math.max(previousRange.end, range.end)
    else merged.push(range)
  }

  return merged
}

// Комментарии — не текст страницы: типографика в них ничего не переносит, зато правки шумят
// в диффе и в отчёте. Ищем их сканером, а не регуляркой: `//` встречается внутри строк
// (`'https://max.ru/...'`) и внутри регулярных выражений, и по регулярке это неотличимо
// от начала комментария.
// Регуляркой `/` считаем только после оператора или открывающей скобки — после значения
// (`b / c`, `)/3`) это деление.
const REGEX_LITERAL_ALLOWED_AFTER = /[(,=:[!&|?{};+\-*%~^<>]/
const getCommentRanges = (content) => {
  const ranges = []
  let index = 0
  const previousMeaningfulCharacter = (position) => {
    for (let cursor = position - 1; cursor >= 0; cursor--) {
      if (!/\s/.test(content[cursor])) return content[cursor]
    }

    return ''
  }
  const skipQuoted = (quote) => {
    index += 1

    while (index < content.length) {
      if (content[index] === '\\') index += 2
      else if (content[index] === quote) return (index += 1)
      else index += 1
    }
  }
  const pushRange = (start, end) => {
    ranges.push({ end, start })
    index = end
  }

  while (index < content.length) {
    const character = content[index]

    // Строки и шаблонные литералы проходим целиком: внутри них комментариев нет.
    if (character === "'" || character === '"' || character === '`') {
      skipQuoted(character)
      continue
    }
    if (content.startsWith('<!--', index)) {
      const end = content.indexOf('-->', index + 4)
      pushRange(index, end === -1 ? content.length : end + 3)
      continue
    }
    // Порядок важен: `//` — всегда комментарий, пустого регулярного выражения не бывает.
    if (content.startsWith('//', index)) {
      const end = content.indexOf('\n', index)
      pushRange(index, end === -1 ? content.length : end)
      continue
    }
    if (content.startsWith('/*', index)) {
      const end = content.indexOf('*/', index + 2)
      pushRange(index, end === -1 ? content.length : end + 2)
      continue
    }
    if (character === '/' && REGEX_LITERAL_ALLOWED_AFTER.test(previousMeaningfulCharacter(index))) {
      index += 1

      while (index < content.length && content[index] !== '\n') {
        if (content[index] === '\\') index += 2
        else if (content[index] === '/') {
          index += 1
          break
        } else index += 1
      }
      continue
    }

    index += 1
  }

  return ranges
}

// Диапазоны, которые кодмод не трогает ни при правке, ни при отчёте о цепочках.
const getProtectedRanges = (content) => mergeRanges([...getBaseLayoutRanges(content), ...getCommentRanges(content)])

const replaceBreakableHyphens = (content) => {
  const mergedRanges = mergeRanges(
    TECHNICAL_STRING_PATTERNS.flatMap((pattern) =>
      [...content.matchAll(pattern)].map((match) => ({ end: match.index + match[0].length, start: match.index }))
    )
  )

  let replacementCount = 0
  let previousEnd = 0
  let result = ''
  // Дефис и неразрывный дефис приводятся к правилу в обе стороны: повторный прогон
  // возвращает обычный дефис там, где раньше неразрывный поставили зря.
  const replaceInText = (text) =>
    text.replace(HYPHEN_BETWEEN_WORDS_REGEX, (match, left, right) => {
      const touchesCyrillic = /\p{Script=Cyrillic}$/u.test(left) || /^\p{Script=Cyrillic}/u.test(right)
      if (!touchesCyrillic) return match
      const hyphen = needsNonBreakingHyphen(left, right) ? NON_BREAKING_HYPHEN : '-'
      if (match.at(-1) !== hyphen) replacementCount += 1
      return left + hyphen
    })

  for (const range of mergedRanges) {
    result += replaceInText(content.slice(previousEnd, range.start))
    result += content.slice(range.start, range.end)
    previousEnd = range.end
  }

  result += replaceInText(content.slice(previousEnd))

  return { content: result, replacementCount }
}
const fixTypography = (content) => {
  const protectedRanges = getProtectedRanges(content)
  let hyphenCount = 0
  let dashCount = 0
  let previousEnd = 0
  let result = ''
  const fixText = (text) => {
    const fixedSpaces = unescapeTypo(text)
      .replaceAll('&nbsp;', NBSP)
      .replace(HYPHEN_AS_DASH_REGEX, (match, left, right) => {
        if (!/\p{Script=Cyrillic}/u.test(left + right)) return match
        dashCount += 1
        return `${left}${NBSP}${DASH} `
      })
      .replace(NBSP_SEQUENCE_REGEX, NBSP)
      .replace(REGEX, `$1${NBSP}`)
    const fixedHyphens = replaceBreakableHyphens(fixedSpaces)

    hyphenCount += fixedHyphens.replacementCount
    return fixedHyphens.content
  }

  for (const range of protectedRanges) {
    result += fixText(content.slice(previousEnd, range.start))
    result += content.slice(range.start, range.end)
    previousEnd = range.end
  }

  result += fixText(content.slice(previousEnd))

  return { content: result, hyphenCount, dashCount }
}
const maskProtectedRanges = (content) => {
  let previousEnd = 0
  let result = ''

  for (const range of getProtectedRanges(content)) {
    result += content.slice(previousEnd, range.start)
    result += content.slice(range.start, range.end).replace(/[^\n]/g, ' ')
    previousEnd = range.end
  }

  return result + content.slice(previousEnd)
}

// Цепочка слов, склеенных неразрывными пробелами. Она не переносится целиком, поэтому
// длинная цепочка выбрасывает половину строки на следующую и рвёт вёрстку карточек/заголовков.
// «Слово» = буквы/цифры с хвостовой пунктуацией, чтобы в цепочку не попадали теги и tailwind-классы.
const WORD = `[\\p{L}\\p{N}][\\p{L}\\p{N}\\-${NON_BREAKING_HYPHEN}’'.,:;!?«»()₽%]*`
const CHAIN_REGEX = new RegExp(`${WORD}(?:${NBSP}${WORD})+`, 'gu')
// 26 символов: ниже порога в основном одиночные NBSP при длинном слове («и предпринимательства»),
// то есть штатная работа кодмода, а не лишний NBSP. Занижать смысла нет — тонет в шуме.
const DEFAULT_MAX_CHAIN_LENGTH = 26

// Частица не должна начинать строку, поэтому клеится к слову слева — в WORDS такого правила нет.
const PARTICLES = ['ли', 'же', 'бы', 'то']

const IGNORE = ['**/node_modules/**', '**/dist/**', '**/.astro/**']

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('-'))
const MAX_LENGTH_FLAG = /^--max-len=(\d+)$/
const KNOWN_FLAGS = ['--check', '--lint', '--unglue']
const unknownFlags = flags.filter((f) => !KNOWN_FLAGS.includes(f) && !MAX_LENGTH_FLAG.test(f))
if (unknownFlags.length > 0) {
  console.error(`Неизвестный флаг: ${unknownFlags.join(', ')}. Поддерживаются ${KNOWN_FLAGS.join(', ')} и --max-len=N.`)
  process.exit(1)
}
// --check — dry-run для CI (exit 1, если есть что фиксить), --lint — отчёт для человека (всегда exit 0).
let write = !flags.includes('--check') && !flags.includes('--lint')
let showChains = flags.includes('--lint') || flags.includes('--unglue')
let unglue = flags.includes('--unglue')
const failOnChanges = flags.includes('--check')
const maxChainLength = Number(
  flags.find((f) => MAX_LENGTH_FLAG.test(f))?.match(MAX_LENGTH_FLAG)[1] ?? DEFAULT_MAX_CHAIN_LENGTH
)
let targets = args.filter((a) => !a.startsWith('-'))

// ANSI только в живом терминале: в пайпе, логах CI и под NO_COLOR escape-коды превращают вывод в мусор.
const styled = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code) => (text) => (styled ? `\x1b[${code}m${text}\x1b[0m` : String(text))
const bold = paint(1)
const dim = paint(2)
const red = paint(31)
const green = paint(32)
const yellow = paint(33)
const cyan = paint(36)

// Заголовок секции маркером, без линейки во всю ширину: длинная черта перетягивает внимание
// на себя, а глазу нужны сами находки.
const section = (title, note) => `\n  ${green('▸')} ${bold(title)}${note ? `  ${dim(`· ${note}`)}` : ''}`

// «1 лишний», но «2 лишних»: единственное число только у чисел, не оканчивающихся на 11 и на 1.
const plural = (count, one, many) => `${count} ${count % 10 === 1 && count % 100 !== 11 ? one : many}`

// Сам NBSP подсвечиваем инверсией, чтобы в цепочке было видно, где именно он стоит.
// Лишние — красным по тому же принципу: глазами сразу ясно, какой из них удалится.
const markNbsp = (extra) => (styled ? `\x1b[${extra ? '41;97' : '43;30'}m·\x1b[0m` : extra ? '×' : '·')

// Принимает путь до файла/папки или имя проекта в apps/ (можно частичное: `presale`).
const getTargetResolution = (target) => {
  for (const candidate of [target, path.join('apps', target)]) {
    if (fs.existsSync(candidate)) return { path: candidate }
  }

  const matches = fs.readdirSync('apps').filter((name) => name.includes(target))
  if (matches.length === 1) return { path: path.join('apps', matches[0]) }

  return matches.length > 1
    ? { error: `Неоднозначное имя «${target}». Кандидаты:\n${matches.join('\n')}` }
    : { error: `Не найден проект или путь «${target}»` }
}
const resolveTarget = (target) => {
  const resolution = getTargetResolution(target)

  if (resolution.path) return resolution.path

  console.error(dim(`  ${resolution.error.replaceAll('\n', '\n  ')}`))
  return null
}

// Внутри репо путь короче абсолютного, снаружи — наоборот («../../../..» нечитаемо).
const shortPath = (file) => {
  const relative = path.relative(process.cwd(), file)
  return relative.startsWith('..') ? file : relative
}

const collectFiles = async () => {
  const files = []
  for (const rawTarget of targets) {
    const target = resolveTarget(rawTarget)
    if (target === null) process.exit(1)

    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      const dir = target.replace(/\/+$/, '')
      files.push(...(await glob([`${dir}/**/*.astro`, `${dir}/**/data/**/*.ts`], { ignore: IGNORE, absolute: true })))
    } else {
      files.push(path.resolve(target))
    }
  }
  return files
}

// Оправдан ли конкретный NBSP между двумя словами. Всё, что не оправдано, — кандидат на удаление.
// Ошибка здесь дороже пропуска: снести NBSP в «295 ₽» или «с 8:00» хуже, чем оставить лишний.
const isJustified = (left, right) => {
  const leftWord = left.replace(/[^\p{L}\p{N}]+$/u, '').toLowerCase()
  const rightWord = right.replace(/[^\p{L}\p{N}]+.*$/u, '').toLowerCase()

  if (WORDS.includes(leftWord)) return true // само правило кодмода
  if (PARTICLES.includes(rightWord)) return true // «хотя бы», «можно ли»
  if (/\p{N}/u.test(leftWord) || /^\p{N}/u.test(rightWord)) return true // числа, время, даты
  return /^[₽%°—–-]/u.test(right) // единицы измерения и тире
}

// Возвращает длинные цепочки с абсолютными смещениями тех NBSP, которые ничем не оправданы.
const analyze = (content) => {
  const found = []
  let lineStart = 0

  content.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(CHAIN_REGEX)) {
      if (match[0].length <= maxChainLength) continue

      const parts = match[0].split(NBSP)
      const extra = []
      let cursor = lineStart + match.index

      for (let i = 0; i < parts.length - 1; i++) {
        cursor += parts[i].length
        if (!isJustified(parts[i], parts[i + 1])) extra.push(cursor)
        cursor += NBSP.length
      }

      found.push({ chain: match[0], start: lineStart + match.index, line: index + 1, extra })
    }
    lineStart += line.length + 1
  })

  return found
}

const renderChain = ({ chain, start, extra }) => {
  const marked = new Set(extra)
  let offset = start
  let out = ''

  for (const char of chain) {
    out += char === NBSP ? markNbsp(marked.has(offset)) : char
    offset += char.length
  }
  return out
}

const stripOffsets = (content, offsets) => {
  let result = ''
  let previous = 0

  for (const offset of [...offsets].sort((a, b) => a - b)) {
    result += `${content.slice(previous, offset)} `
    previous = offset + NBSP.length
  }
  return result + content.slice(previous)
}

// Диалог рисуется одной вертикальной направляющей: видно, что шаги — части одного прогона,
// а не независимые куски вывода, и глаз держится на левом крае.
const bar = () => cyan('│')
const wizardOpen = (title, note) => console.log(`\n ${green(bold(title))} ${dim(`(${note})`)}`)
const wizardStep = (title, step) => {
  console.log(bar())
  console.log(`${green('◆')}  ${bold(title)}  ${dim(step)}`)
}
const wizardLine = (text) => console.log(`${bar()}  ${text}`)
const wizardClose = (text) => console.log(`${cyan('└')}  ${dim(text)}`)
const wizardError = (message) => {
  console.log(bar())
  message.split('\n').forEach((line, index) => wizardLine(`${index === 0 ? red('×') : ' '} ${red(line)}`))
  console.log(bar())
}

const selectChoice = async (options) =>
  await new Promise((resolve, reject) => {
    const input = process.stdin
    const output = process.stdout
    const wasPaused = input.isPaused()
    const wasRawMode = input.isRaw
    let selectedIndex = 0
    let rendered = false

    const render = () => {
      if (rendered) {
        moveCursor(output, 0, -options.length)
        cursorTo(output, 0)
        clearScreenDown(output)
      }

      const lines = options.map(({ label }, index) => {
        const selected = index === selectedIndex
        const marker = selected ? green('❯') : ' '
        const optionLabel = selected ? bold(label) : label
        const enterHint = selected ? dim('   ← Enter') : ''

        return `${bar()}  ${marker} ${cyan(index + 1)}  ${optionLabel}${enterHint}`
      })

      lines.push(`${bar()}  ${dim(`↑/↓ выбрать · Enter подтвердить · 1–${options.length} быстрый выбор`)}`)
      output.write(lines.join('\n'))
      rendered = true
    }
    const cleanup = () => {
      input.removeListener('keypress', onKeypress)
      input.setRawMode(Boolean(wasRawMode))
      if (wasPaused) input.pause()
      output.write('\n')
    }
    const finish = (option) => {
      cleanup()
      resolve(option.value)
    }
    const cancel = () => {
      const error = new Error('Отменено')

      error.code = 'ABORT_ERR'
      cleanup()
      reject(error)
    }
    const onKeypress = (text, key) => {
      if ((key.ctrl && (key.name === 'c' || key.name === 'd')) || key.name === 'escape') {
        cancel()
        return
      }
      if (key.name === 'up' || key.name === 'down') {
        const direction = key.name === 'up' ? -1 : 1

        selectedIndex = (selectedIndex + direction + options.length) % options.length
        render()
        return
      }
      if (key.name === 'return' || key.name === 'enter') {
        finish(options[selectedIndex])
        return
      }

      const optionIndex = Number.parseInt(text, 10) - 1
      if (optionIndex >= 0 && optionIndex < options.length) {
        selectedIndex = optionIndex
        render()
        finish(options[selectedIndex])
      }
    }

    emitKeypressEvents(input)
    input.on('keypress', onKeypress)
    input.setRawMode(true)
    input.resume()
    render()
  })

const askChoice = async (step, question, options) => {
  wizardStep(question, step)

  return await selectChoice(options)
}

const askText = async () => {
  const inputInterface = readline.createInterface({ input: process.stdin, output: process.stdout })
  // Без сигнала закрытый ввод (Ctrl+D, EOF) оставляет промис висеть, и процесс молча умирает.
  const cancellation = new AbortController()
  inputInterface.on('close', () => cancellation.abort())

  try {
    return (await inputInterface.question(`${bar()}  ${green('›')} `, { signal: cancellation.signal })).trim()
  } finally {
    inputInterface.close()
  }
}

// Ctrl+D / закрытый ввод — это отмена, а не падение: незачем показывать стек.
const cancelled = (error) => {
  if (error?.code !== 'ABORT_ERR') throw error

  console.log(`${cyan('└')}  ${dim('отменено')}`)
  process.exit(0)
}

// Запуск без цели: в терминале спрашиваем, в пайпе/CI падаем — иначе скрипт молча повиснет на вопросе.
const runWizard = async () => {
  try {
    wizardOpen('ПРОБЕЛЫЧ', 'неразрывные пробелы и дефисы в русском тексте')

    wizardStep('Куда смотрим?', '1/3')
    wizardLine(dim('Проект, папка или файл — можно короткое имя, например, presale'))

    while (targets.length === 0) {
      const answer = await askText()
      if (answer === '') continue

      const parts = answer.split(/\s+/)
      const resolutions = parts.map(getTargetResolution)
      const errors = resolutions.flatMap((resolution) => (resolution.error ? [resolution.error] : []))

      if (errors.length === 0) targets = parts
      else for (const error of errors) wizardError(error)
    }

    showChains = await askChoice('2/3', 'Что проверяем?', [
      { label: 'пробелы и дефисы + длинные цепочки NBSP', value: true },
      { label: 'только пробелы и дефисы', value: false },
    ])

    write = await askChoice('3/3', 'Что делаем с найденным?', [
      { label: 'исправить файлы', value: true },
      { label: 'только показать', value: false },
    ])

    wizardClose(
      `${targets.join(', ')} · ${showChains ? 'с цепочками' : 'без цепочек'} · ${write ? 'правим' : 'смотрим'}`
    )
  } catch (error) {
    cancelled(error)
  }
}

const interactive = targets.length === 0 && process.stdin.isTTY
if (targets.length === 0) {
  if (!interactive) {
    console.error('Укажи проект, папку или файлы: pnpm fix-nbsp <project|path|files...>')
    console.error('Запуск по всему монорепо не поддерживается — слишком большой дифф.')
    process.exit(1)
  }
  await runWizard()
}

const files = await collectFiles()

const touched = []
const reports = []
let chainCount = 0
let extraCount = 0
let hyphenCount = 0
let dashCount = 0

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const fixedTypography = fixTypography(content)
  const fixed = fixedTypography.content

  hyphenCount += fixedTypography.hyphenCount
  dashCount += fixedTypography.dashCount

  // Считаем по итоговому тексту: сам фикс тоже добавляет NBSP и может удлинить цепочку.
  const chains = analyze(maskProtectedRanges(fixed))
  if (chains.length > 0) {
    chainCount += chains.length
    extraCount += chains.reduce((sum, chain) => sum + chain.extra.length, 0)
    reports.push({ file, content: fixed, chains })
  }

  if (fixed === content) continue

  touched.push(shortPath(file))
  if (write) fs.writeFileSync(file, fixed)
}

if (touched.length > 0) {
  console.log(section(write ? 'Исправлены пробелы, дефисы и тире' : 'Требуют фикса'))
  for (const rel of touched) console.log(`    ${green(write ? '✓' : '•')} ${rel}`)
}

if (showChains && reports.length > 0) {
  console.log(section(`Длинные цепочки NBSP`, `порог ${maxChainLength} символов`))
  for (const { file, chains } of reports) {
    console.log(`\n    ${cyan(shortPath(file))}`)

    // Цепочки внутри файла разной длины, поэтому колонку с находками добиваем до самой широкой:
    // иначе «сколько лишних» и номер строки скачут по горизонтали.
    const columnWidth = Math.max(...chains.map(({ chain }) => chain.length))

    for (const chain of chains) {
      const padding = ' '.repeat(columnWidth - chain.chain.length)
      const badge = chain.extra.length > 0 ? yellow(plural(chain.extra.length, 'лишний', 'лишних')) : dim('по правилу')
      console.log(
        `    ${dim(String(chain.chain.length).padStart(3))}  «${renderChain(chain)}»${padding}  ${badge}  ${dim(`:${chain.line}`)}`
      )
    }
  }
}

// Отдельный вопрос после отчёта: удаление NBSP необратимо кодмодом, поэтому сначала показываем,
// что именно уйдёт, и только потом спрашиваем. Флагом --unglue тот же шаг делается без вопроса.
if (extraCount > 0 && write && interactive && !unglue) {
  try {
    const question = `Удалить ${plural(extraCount, 'лишний', 'лишних')} NBSP (красные выше)?`
    unglue = await askChoice('ещё шаг', question, [
      { label: 'нет, оставить как есть', value: false },
      { label: 'да, удалить', value: true },
    ])
  } catch (error) {
    cancelled(error)
  }
}

const unglued = []
if (unglue && write) {
  for (const { file, content, chains } of reports) {
    const offsets = chains.flatMap((chain) => chain.extra)
    if (offsets.length === 0) continue

    fs.writeFileSync(file, stripOffsets(content, offsets))
    unglued.push(shortPath(file))
  }

  if (unglued.length > 0) {
    console.log(section('Удалены лишние NBSP'))
    for (const rel of unglued) console.log(`    ${green('✓')} ${rel}`)
  }
}

// Цифры — правым краем в одну колонку, подсказки — отдельным блоком под таблицей:
// вперемешку со строками они разрывают колонку и её перестаёт быть видно.
const rows = [['Проверено файлов', files.length, dim]]
const hints = []

rows.push([write ? 'Исправлено' : 'Требуют фикса', touched.length, touched.length > 0 ? yellow : green])
rows.push(['Неразрывных дефисов', hyphenCount, hyphenCount > 0 ? yellow : green])
rows.push(['Тире вместо дефиса', dashCount, dashCount > 0 ? yellow : green])
if (write && touched.length === 0) hints.push('предлоги и союзы уже проставлены — автофиксу нечего менять')

if (showChains || chainCount > 0) {
  const left = unglue && write ? 0 : extraCount
  rows.push(['Длинных цепочек NBSP', chainCount, chainCount > 0 ? yellow : green])
  rows.push(['Лишних NBSP', left, left > 0 ? yellow : green])

  if (left > 0) {
    hints.push(
      showChains
        ? 'снять их: pnpm fix-nbsp --unglue <target> (или «да» в диалоге)'
        : 'подробнее: pnpm fix-nbsp --lint <target>'
    )
  }
  if (chainCount > extraCount) hints.push('остальные цепочки — работа самого кодмода, руками их не трогаем')
}

const labelWidth = Math.max(...rows.map(([label]) => label.length))

console.log(section('Итог'))
for (const [label, value, tone] of rows) {
  console.log(`    ${dim(label.padEnd(labelWidth))}   ${tone(String(value).padStart(3))}`)
}
if (hints.length > 0) {
  console.log('')
  for (const hint of hints) console.log(dim(`    · ${hint}`))
}

// --check для CI: сам факт «есть что фиксить» должен валить прогон.
if (failOnChanges && touched.length > 0) {
  console.log(dim('\n  --check: запусти без флага, чтобы применить'))
  process.exit(1)
}
