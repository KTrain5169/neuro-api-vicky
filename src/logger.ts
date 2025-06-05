import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

export class Logger {
  private logPath: string

  constructor(runId: string) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    const filename = `vicky_${date}_${time}_${runId}.log`

    // Place the log file directly under the current working directory:
    const dir = process.cwd()

    // Make sure the directory exists (in case it was deleted):
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    } catch {
      mkdirSync(dir, { recursive: true })
    }

    this.logPath = join(dir, filename)

    // And make sure the parent folder for logPath still exists:
    const parentDir = dirname(this.logPath)
    try {
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }
    } catch {
      mkdirSync(parentDir, { recursive: true })
    }
  }

  private stamp(): string {
    return new Date().toISOString()
  }

  log(level: LogLevel, message: string) {
    const line = `[${this.stamp()}] ${level}: ${message}\n`

    // Just before writing, re‑create the parent directory if it’s gone:
    const parentDir = dirname(this.logPath)
    try {
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }
    } catch {
      mkdirSync(parentDir, { recursive: true })
    }

    appendFileSync(this.logPath, line, 'utf8')
    console[level.toLowerCase() as 'log'](line.trim())
  }

  info(msg: string) {
    this.log('INFO', msg)
  }
  warn(msg: string) {
    this.log('WARN', msg)
  }
  error(msg: string) {
    this.log('ERROR', msg)
  }
  debug(msg: string) {
    this.log('DEBUG', msg)
  }
  critical(msg: string) {
    this.log('CRITICAL', msg)
  }

  get path() {
    return this.logPath
  }
}
