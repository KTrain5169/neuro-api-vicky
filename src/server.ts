import { WebSocketServer } from 'ws'
import Ajv from 'ajv'
import { Logger } from './logger.js'
import { IncomingPacket } from './types.js'

export type PacketList = any[]

export function startServer(
  port: number,
  logger: Logger,
  packetList: PacketList | null
): WebSocketServer {
  logger.info(`Starting WebSocket server on port ${port}`)
  if (packetList) {
    logger.info(`Loaded packet list with ${packetList.length} entries`)
  }

  const wss = new WebSocketServer({ port })
  wss.on('connection', (ws) => {
    logger.info('New connection established')
    let sawStartup = false
    const actionsStore = new Map<
      string,
      { schema: object; description: string }
    >()
    const ajv = new (Ajv as any)()

    ws.on('message', (data) => {
      let pkt: IncomingPacket
      try {
        pkt = JSON.parse(data.toString())
      } catch {
        logger.error('Malformed JSON packet')
        process.exit(1)
      }

      switch (pkt.command) {
        case 'startup':
          if (sawStartup) {
            logger.warn('Received duplicate startup packet')
          } else {
            sawStartup = true
            actionsStore.clear()
            logger.info(`Now playing (${pkt.game})`)
          }
          break

        case 'actions/register':
          if (!sawStartup) {
            logger.error('Register before startup')
            process.exit(1)
          }
          for (const act of pkt.data.actions) {
            if (actionsStore.has(act.name)) {
              logger.warn(`Action "${act.name}" already registered`)
            } else {
              // validate JSON Schema
              try {
                ajv.compile(act.schema || {})
              } catch (e) {
                logger.error(`Invalid schema for action "${act.name}": ${e}`)
                process.exit(1)
              }
              actionsStore.set(act.name, {
                schema: act.schema || {},
                description: act.description
              })
              logger.info(`Registered action "${act.name}"`)
            }
          }
          break

        case 'actions/unregister':
          if (!sawStartup) {
            logger.error('Unregister before startup')
            process.exit(1)
          }
          for (const name of pkt.data.action_names) {
            if (actionsStore.delete(name)) {
              logger.info(`Unregistered action "${name}"`)
            }
          }
          break

        case 'context':
          if (!sawStartup) {
            logger.error('Context before startup')
            process.exit(1)
          }
          logger.info(
            `Context: "${pkt.data.message}" (silent=${pkt.data.silent})`
          )
          break

        case 'actions/force':
          if (!sawStartup) {
            logger.error('Force before startup')
            process.exit(1)
          }
          logger.info(`Force request: ${JSON.stringify(pkt.data)}`)
          // TODO: If you want to replay/send packets from packetList, do so here.
          break

        case 'shutdown/ready':
          logger.warn(
            'Shutdown ready command packet received. This is a proposed API, and is not guaranteed to make its way into the official specs.'
          )
          logger.warn(
            'Shutdown ready command packet received. This is part of the Game Automation API, which should not be implemented by most games.'
          )
          break

        default:
          logger.error(`Unknown command: ${(pkt as any).command}`)
          process.exit(1)
      }
    })

    ws.on('close', () => {
      logger.info('Connection closed')
    })
  })

  return wss
}

export function stopServer(wss: WebSocketServer, logger: Logger) {
  logger.info('Shutting down WebSocket server')
  wss.close((err) => {
    if (err) logger.error(`Error closing server: ${err}`)
    else logger.info('WebSocket server closed')
  })
}
