import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import WebSocket from 'ws'
import { Logger } from '../src/logger'
import { startServer, stopServer } from '../src/server'

describe('startServer/stopServer', () => {
  let tmpDir: string
  let logger: Logger
  let wss: ReturnType<typeof startServer>
  let port: number
  const runId = 'server-test'

  beforeAll(() => {
    // Create a temp folder so logger writes there
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vicky-server-test-'))
    process.chdir(tmpDir)
    logger = new Logger(runId)
    jest.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never
    })
  })

  afterAll(() => {
    ;(process.exit as unknown as jest.Mock).mockRestore()
    // Clean up: stop server (if still running), then delete temp dir
    if (wss) {
      try {
        stopServer(wss, logger)
      } catch {}
    }
    process.chdir(__dirname)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  beforeEach(() => {
    wss = undefined!
    // Create a temp folder for logger output, then cd into it
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vicky-server-test-'))
    process.chdir(tmpDir)
    logger = new Logger(runId)
  })

  afterEach(() => {
    // Just clear mocks; DON’T delete tmpDir here.
    jest.clearAllMocks()
  })

  test('processes a sequence of valid packets and logs expected lines', (done) => {
    // 1) Read valid fixture
    const fixturePath = path.join(
      __dirname,
      '../__fixtures__/packets.valid.json'
    )
    const raw = fs.readFileSync(fixturePath, 'utf8')
    const packetList = JSON.parse(raw)

    // 2) Start WS server on port 0 (random free port)
    const wssInstance = startServer(0, logger, packetList)
    wss = wssInstance
    wss.on('listening', () => {
      // @ts-ignore: address() returns AddressInfo
      const addressInfo = wss.address() as { port: number }
      port = addressInfo.port

      // 3) Connect a WS client
      const client = new WebSocket(`ws://localhost:${port}`)
      client.on('open', () => {
        // Send each packet in sequence, pausing ~50ms between them
        let idx = 0
        const sendNext = () => {
          if (idx >= packetList.length) {
            // Done sending all packets—close client
            setTimeout(() => {
              client.close()
            }, 50)
            return
          }
          client.send(JSON.stringify(packetList[idx]))
          idx += 1
          setTimeout(sendNext, 50)
        }
        sendNext()
      })

      client.on('close', () => {
        // Give the server a moment to finish logging
        setTimeout(() => {
          // 4) Read the logfile and assert contents
          const logPath = logger.path
          expect(fs.existsSync(logPath)).toBe(true)
          const lines = fs.readFileSync(logPath, 'utf8').trim().split(/\r?\n/)
          const contentsJoined = lines.join('\n')

          expect(contentsJoined).toMatch(
            /Starting WebSocket server on port \d+/
          )
          expect(contentsJoined).toMatch(/Loaded packet list with \d+ entries/)
          expect(contentsJoined).toMatch(/New connection established/)
          expect(contentsJoined).toMatch(/Now playing \(testGame\)/)
          expect(contentsJoined).toMatch(/Registered action "jump"/)
          expect(contentsJoined).toMatch(/Unregistered action "jump"/)
          expect(contentsJoined).toMatch(/Context: "Hello"/)
          expect(contentsJoined).toMatch(
            /Force request:.*"query":"doSomething"/
          )
          expect(contentsJoined).toMatch(
            /Shutdown ready command packet received/
          )
          expect(contentsJoined).toMatch(/Connection closed/)

          done()
        }, 100)
      })

      client.on('error', (err) => {
        done(err) // Fail test on error
      })
    })
  })

  test('exits on invalid packet (no startup)', (done) => {
    // 1) Read invalid fixture
    const fixturePath = path.join(
      __dirname,
      '../__fixtures__/packets.invalid.json'
    )
    const raw = fs.readFileSync(fixturePath, 'utf8')
    const packetList = JSON.parse(raw)

    // 2) Start a fresh server & logger in another temp subdir
    const subTmp = fs.mkdtempSync(
      path.join(os.tmpdir(), 'vicky-server-invalid-')
    )
    process.chdir(subTmp)
    const invLogger = new Logger(`${runId}-invalid`)
    const serverInvalid = startServer(0, invLogger, packetList)
    wss = serverInvalid

    serverInvalid.on('listening', () => {
      const addressInfo = serverInvalid.address() as { port: number }
      const portInvalid = addressInfo.port

      const failTimeout = setTimeout(() => {
        done(new Error('Timeout waiting for WebSocket to close'))
      }, 4500)

      const client = new WebSocket(`ws://localhost:${portInvalid}`)
      client.on('open', () => {
        // Send only the invalid packet (actions/register without startup)
        client.send(JSON.stringify(packetList[0]))
        setTimeout(() => client.close(), 10000)
      })

      client.on('close', () => {
        // Give the server a moment to log the error
        clearTimeout(failTimeout)
        setTimeout(() => {
          const logPath = invLogger.path
          const content = fs.readFileSync(logPath, 'utf8')
          expect(content).toMatch(/ERROR: Register before startup/)

          // Clean up now that all logging is complete:
          stopServer(serverInvalid, invLogger)
          // Return to a known working directory so we can delete subTmp
          process.chdir(__dirname)
          fs.rmSync(subTmp, { recursive: true, force: true })
          done()
        }, 100)
      })

      client.on('error', (err) => {
        done(err)
      })
    })
  }, 10000)
})
