import { Logger } from '../src/logger'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('Logger', () => {
  let tmpDir: string

  beforeAll(() => {
    // Create a temporary directory so all log files land here
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vicky-logger-test-'))
    process.chdir(tmpDir)
  })

  afterAll(() => {
    // Clean up: delete the temp folder recursively
    process.chdir(__dirname) // move out of temp so we can delete it
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('writes INFO/WARN/ERROR lines after first log call', () => {
    const runId = 'unit-test'
    const logger = new Logger(runId)

    const logPath = logger.path
    // The file is not actually created until we write something. So first write:
    logger.info('Hello world')

    expect(fs.existsSync(logPath)).toBe(true)

    // Now write the other lines
    logger.warn('This is a warning')
    logger.error('Serious error')

    const content = fs.readFileSync(logPath, 'utf8')
    const lines = content.trim().split(/\r?\n/)
    expect(lines.length).toBe(3)

    expect(lines[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] INFO: Hello world/)
    expect(lines[1]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] WARN: This is a warning/)
    expect(lines[2]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] ERROR: Serious error/)
  })
})
