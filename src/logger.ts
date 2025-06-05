import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'fs'
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

    const dir = process.cwd()

    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    } catch {
      mkdirSync(dir, { recursive: true })
    }

    this.logPath = join(dir, filename)

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

export class Store {
  private contextStorePath: string
  private actionsStorePath: string

  constructor(runId: string) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    const actionsStoreFilename = `store/vicky_${date}_${time}_${runId}_actions-store.json`
    const contextStoreFilename = `store/vicky_${date}_${time}_${runId}_context-store.json`

    const dir = process.cwd()

    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    } catch {
      mkdirSync(dir, { recursive: true })
    }

    this.contextStorePath = join(dir, contextStoreFilename)
    this.actionsStorePath = join(dir, actionsStoreFilename)

    const contextStoreDirParent = dirname(this.contextStorePath)
    try {
      if (!existsSync(contextStoreDirParent)) {
        mkdirSync(contextStoreDirParent, { recursive: true })
      }
    } catch {
      mkdirSync(contextStoreDirParent, { recursive: true })
    }

    const actionsStoreDirParent = dirname(this.actionsStorePath)
    try {
      if (!existsSync(actionsStoreDirParent)) {
        mkdirSync(actionsStoreDirParent, { recursive: true })
      }
    } catch {
      mkdirSync(actionsStoreDirParent, { recursive: true })
    }
  }

  contextAdd(message: string, source: string, game: string, silent = true) {
    const contextEntry = {
      timestamp: new Date().toISOString(),
      message,
      source,
      game,
      silent
    }

    let store: any[] = []
    try {
      if (existsSync(this.contextStorePath)) {
        const raw = readFileSync(this.contextStorePath, 'utf8')
        store = JSON.parse(raw)
      }
    } catch {
      store = []
    }

    store.push(contextEntry)

    writeFileSync(this.contextStorePath, JSON.stringify(store, null, 2), 'utf8')
  }

  actionsAdd(action: string, source: string, reason?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      source,
      reason: reason || null
    }

    let store: any[] = []
    try {
      if (existsSync(this.actionsStorePath)) {
        const raw = readFileSync(this.actionsStorePath, 'utf8')
        store = JSON.parse(raw)
      }
    } catch {
      store = []
    }

    store.push(entry)

    writeFileSync(this.actionsStorePath, JSON.stringify(store, null, 2), 'utf8')
  }

  getContext(): any[] {
    try {
      if (existsSync(this.contextStorePath)) {
        const raw = readFileSync(this.contextStorePath, 'utf8')
        return JSON.parse(raw)
      }
    } catch {
      return []
    }
    return []
  }

  get contextPath() {
    return this.contextStorePath
  }

  get actionsPath() {
    return this.actionsStorePath
  }
}
