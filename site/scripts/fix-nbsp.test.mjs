import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('./fix-nbsp.mjs', import.meta.url))
const temporaryDirectories = []

const writeTemporaryFile = (sourceText) => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'fix-nbsp-'))
  const targetPath = path.join(temporaryDirectory, 'content.ts')

  temporaryDirectories.push(temporaryDirectory)
  writeFileSync(targetPath, sourceText)

  return targetPath
}

const transformText = (sourceText) => {
  const targetPath = writeTemporaryFile(sourceText)

  execFileSync(process.execPath, [scriptPath, targetPath])

  return readFileSync(targetPath, 'utf8')
}

const runScript = (sourceText, scriptArguments) => {
  const targetPath = writeTemporaryFile(sourceText)
  const output = execFileSync(process.execPath, [scriptPath, ...scriptArguments, targetPath], { encoding: 'utf8' })

  return { output, content: readFileSync(targetPath, 'utf8') }
}

const lintText = (sourceText, extraArguments = []) => runScript(sourceText, ['--lint', ...extraArguments])
const unglueText = (sourceText) => runScript(sourceText, ['--unglue'])

afterEach(() => {
  temporaryDirectories.splice(0).forEach((temporaryDirectory) => {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  })
})

describe('fix-nbsp', () => {
  const cases = [
    ['на семейное обучение', 'на семейное обучение'],
    ['на  семейное обучение', 'на семейное обучение'],
    ['на  семейное обучение', 'на семейное обучение'],
    ['на  семейное обучение', 'на семейное обучение'],
    ['на &nbsp;семейное обучение', 'на семейное обучение'],
    ['мы  автоматически сформируем', 'мы автоматически сформируем'],
    ['слово &nbsp; слово', 'слово слово'],
    ['слово  слово', 'слово слово'],
  ]

  cases.forEach(([sourceText, expectedText]) => {
    test(`normalizes non-breaking space sequence: ${sourceText}`, () => {
      assert.equal(transformText(sourceText), expectedText)
    })
  })

  test('does not change double spaces after other words', () => {
    assert.equal(transformText('семейное  обучение'), 'семейное  обучение')
  })

  test('does not glue a word part after a non-breaking hyphen on a repeated run', () => {
    const NBSP = String.fromCharCode(0xa0)
    const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011)
    const firstRun = transformText('Что-то пошло не так')

    assert.equal(firstRun, `Что${NON_BREAKING_HYPHEN}то пошло не${NBSP}так`)
    assert.equal(transformText(firstRun), firstRun)
  })

  describe('non-breaking hyphen', () => {
    const NON_BREAKING_HYPHEN = String.fromCharCode(0x2011)
    const glued = (text) => text.replaceAll('-', NON_BREAKING_HYPHEN)

    const nonBreaking = [
      'ИТ-колледж',
      'IT-школа',
      'топ-10',
      '7-дневный',
      'из-за',
      'по-русски',
      'кое-что',
      'какой-либо',
      'где-нибудь',
      'онлайн-школа',
      'мастер-класс',
      'топ-преподаватель',
    ]
    nonBreaking.forEach((word) => {
      test(`glues ${word}`, () => {
        assert.equal(transformText(word), glued(word))
      })
    })

    const breakable = ['Художник-мультипликатор', 'Преподаватели-практики', 'вице-президент', 'IT-specialist', '1-4']
    breakable.forEach((word) => {
      test(`keeps a regular hyphen in ${word}`, () => {
        assert.equal(transformText(word), word)
      })
    })

    test('returns a regular hyphen where a non-breaking one was set by mistake', () => {
      assert.equal(transformText(glued('Художник-мультипликатор')), 'Художник-мультипликатор')
    })

    test('does not touch hyphens in technical strings', () => {
      assert.equal(transformText("const url = '/онлайн-школа'"), "const url = '/онлайн-школа'")
    })
  })
})

describe('hyphen as dash', () => {
  const NBSP = String.fromCharCode(0xa0)

  test('turns a spaced hyphen between words into a dash', () => {
    assert.equal(transformText('это успех - вдохновить'), `это успех${NBSP}— вдохновить`)
  })

  test('is idempotent', () => {
    const firstRun = transformText('ЕГЭ - экзамен')

    assert.equal(transformText(firstRun), firstRun)
  })

  const untouched = ['const width = height - offset', '5 - 9', '- пункт списка', 'Художник-мультипликатор']
  untouched.forEach((text) => {
    test(`keeps ${text}`, () => {
      assert.equal(transformText(text), text)
    })
  })
})

describe('fix-nbsp --lint', () => {
  const NBSP = String.fromCharCode(0xa0)
  const longChain = `Понять,${NBSP}комфортно${NBSP}ли${NBSP}ему${NBSP}учиться в${NBSP}группе`

  test('reports a long non-breaking chain', () => {
    const { output } = lintText(longChain)

    assert.match(output, /32\s+«Понять,/)
    assert.match(output, /Длинных цепочек NBSP\s+1/)
  })

  test('does not modify the file', () => {
    const { content } = lintText(longChain)

    assert.equal(content, longChain)
  })

  test('reports nothing for chains under the threshold', () => {
    const { output } = lintText(`учиться в${NBSP}группе`)

    assert.match(output, /Длинных цепочек NBSP\s+0/)
  })

  test('respects --max-len', () => {
    const { output } = lintText(longChain, ['--max-len=40'])

    assert.match(output, /Длинных цепочек NBSP\s+0/)
  })

  test('ignores markup around the chain', () => {
    const { output } = lintText(`<a class='underline text-blue' href='/x'>в${NBSP}поддержку</a>`)

    assert.match(output, /Длинных цепочек NBSP\s+0/)
  })

  test('counts only unjustified non-breaking spaces as removable', () => {
    const { output } = lintText(longChain)

    assert.match(output, /Лишних NBSP\s+2/)
  })
})

describe('fix-nbsp --unglue', () => {
  const NBSP = String.fromCharCode(0xa0)

  test('removes unjustified non-breaking spaces and keeps the rule-driven ones', () => {
    const source = `Понять,${NBSP}комфортно${NBSP}ли${NBSP}ему${NBSP}учиться в${NBSP}группе`
    const { content } = unglueText(source)

    assert.equal(content, `Понять, комфортно${NBSP}ли${NBSP}ему учиться в${NBSP}группе`)
  })

  test('never breaks numbers, time and units apart', () => {
    const source = `Стоимость обучения${NBSP}295${NBSP}₽ занятия с${NBSP}8:00${NBSP}до${NBSP}21:00`
    const { content } = unglueText(source)

    assert.equal(content, `Стоимость обучения${NBSP}295${NBSP}₽ занятия с${NBSP}8:00${NBSP}до${NBSP}21:00`)
  })

  test('leaves chains under the threshold alone', () => {
    const source = `слово${NBSP}другое`
    const { content } = unglueText(source)

    assert.equal(content, source)
  })
})
