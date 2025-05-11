import { createServer } from '../src/server'
import WebSocket from 'ws'
import { jest } from '@jest/globals'
import { faker } from '@faker-js/faker'

describe('Server', () => {
  let server: ReturnType<typeof createServer>
  const testPort = 8081
  const wsInstances: WebSocket[] = []

  beforeAll((done) => {
    server = createServer(testPort)
    // Wait briefly for the server to be listening.
    setTimeout(done, 100)
  })

  afterEach(() => {
    // Close every WebSocket opened during a test.
    wsInstances.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    })
    wsInstances.length = 0
  })

  afterAll((done) => {
    server.close(() => {
      done()
    })
  })

  test('should accept a valid startup packet', (done) => {
    const ws = new WebSocket(`ws://localhost:${testPort}`)
    wsInstances.push(ws)
    ws.on('open', () => {
      const startup = JSON.stringify({ command: 'startup', game: 'TestGame' })
      ws.send(startup)
      // Give the server a short time to process.
      setTimeout(() => {
        ws.close()
        done()
      }, 50)
    })
  })

  test('should exit on game mismatch', (done) => {
    const originalExit = process.exit
    // Mock process.exit so that it throws an error.
    process.exit = jest.fn((code?: number) => {
      throw new Error(`Mock exit with code: ${code}`)
    }) as any

    const ws = new WebSocket(`ws://localhost:${testPort}`)
    wsInstances.push(ws)
    ws.on('open', () => {
      // Send valid startup.
      ws.send(JSON.stringify({ command: 'startup', game: 'TestGame' }))
    })
    // Listen for error events (which catch the thrown error).
    ws.on('error', (err: Error) => {
      try {
        expect(err.message).toMatch(/Mock exit with code: 1/)
      } finally {
        process.exit = originalExit
        ws.close()
        done()
      }
    })
    // Also send the mismatching game packet after WS open
    ws.on('open', () => {
      ws.send(JSON.stringify({
        command: "actions/force",
        game: faker.lorem.words(3)
      }))
    })
    
    // Increase timeout on this test if needed:
  }, 3000)
})