import { spawn } from 'child_process'
import { Logger } from './logger.js'

export interface RunResult {
  success: boolean
  durationMs: number
}

export function runTest(
  runner: string,
  testFile: string,
  logger: Logger
): Promise<RunResult> {
  return new Promise((resolve) => {
    const start = Date.now()
    const cmd = runner && runner.trim().length > 0 ? runner : testFile
    const args: string[] = []
    if (runner && runner.trim().length > 0) {
      args.push(testFile)
    }

    logger.info(`Spawning test process: ${cmd} ${args.join(' ')}`)
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true })

    child.on('close', (code) => {
      const duration = Date.now() - start
      const success = code === 0
      if (success) logger.info(`Test process succeeded in ${duration} ms`)
      else
        logger.error(
          `Test process exited with code ${code} after ${duration} ms`
        )
      resolve({ success, durationMs: duration })
    })

    child.on('error', (err) => {
      const duration = Date.now() - start
      logger.error(`Failed to spawn test process: ${err}`)
      resolve({ success: false, durationMs: duration })
    })
  })
}
