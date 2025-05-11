import * as core from '@actions/core'
import { createServer } from './server.js'
import { existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { logFileName } from './utils.js'

export async function run(): Promise<void> {
  try {
    const port = parseInt(core.getInput('port'), 10) || 8080
    const testFile = core.getInput('testFile')
    const runner = core.getInput('runner')
    const packetList = core.getInput('packet-list')

    // Packet list is now optional.
    if (!packetList) {
      core.info('No packet list provided, running in actions/force mode.')
    }

    const testFilePath = isAbsolute(testFile)
      ? testFile
      : resolve(process.cwd(), testFile)

    if (!existsSync(testFilePath)) {
      throw new Error(`Test file ${testFilePath} does not exist`)
    }

    const server = createServer(port)
    core.info(`WebSocket server started on port ${port}`)

    // Build the command arguments.
    // If a runner command is provided, use it along with the testFile.
    // Otherwise, execute the testFile directly.
    const command = runner ? runner : testFilePath
    const args = runner ? [testFilePath] : []

    await new Promise<void>((resolveProcess, rejectProcess) => {
      const child = spawn(command, args, { shell: true, stdio: 'inherit' })
      child.on('error', rejectProcess)
      child.on('exit', (code) => {
        if (code !== 0) {
          rejectProcess(new Error(`Test process exited with code ${code}`))
        } else {
          resolveProcess()
        }
      })
    })

    // After the test process completes, close the server.
    server.close(() => {
      core.info('WebSocket server closed.')
      // Set the output "log" with the log file path.
      core.setOutput('log', logFileName)
    })
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

// Use ESM-safe main module check.
const mainFileName = fileURLToPath(import.meta.url)
if (process.argv[1] === mainFileName) {
  run()
}
