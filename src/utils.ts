import { appendFileSync } from "fs"

// Get the run ID from GitHub environment or fallback to a random string.
const runId: string =
  process.env.GITHUB_RUN_ID || Math.random().toString(36).substring(2, 8)
// Generate the log file name at the start of the action.
export const logFileName: string = `vicky-${getFormattedTimestamp()}-${runId}.log`
// Optionally, initialize the log file.

// Generalized logging function.
export function logOutput(tag: string, message: string): void {
  const timestamp = getFormattedTimestamp()
  const logLine = `(${timestamp}) [${tag}] ${message}\n`
  appendFileSync(logFileName, logLine)
}

// Helper: Get formatted timestamp with seconds & timezone offset.
export function getFormattedTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => (n < 10 ? '0' + n : n)
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const timezoneOffset = -now.getTimezoneOffset() / 60
  const tz = timezoneOffset >= 0 ? `+${timezoneOffset}` : `${timezoneOffset}`
  return `${date}-${time}${tz}`
}

appendFileSync(
  logFileName,
  `Action log started at ${new Date().toISOString()}\n`
)