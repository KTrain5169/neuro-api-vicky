import { WebSocketServer } from 'ws'
import { JSONSchema7 } from 'json-schema'
import { faker } from '@faker-js/faker'
import { logOutput } from './utils.js'


// Dummy fake data generator using @faker-js/faker.
// This walks through the provided JSON schema and generates fake data based on property type.
function generateFakeData(schema: JSONSchema7 | {}): any {
  const sch = schema as JSONSchema7
  if (sch.properties && typeof sch.properties === 'object') {
    const result: { [key: string]: any } = {}
    for (const key in sch.properties) {
      const propDef = sch.properties[key] as JSONSchema7
      switch (propDef.type) {
        case 'string':
          result[key] = faker.lorem.words()
          break
        case 'number':
          result[key] = faker.number.int()
          break
        case 'boolean':
          result[key] = faker.datatype.boolean()
          break
        // Extend with additional types as needed.
        default:
          result[key] = faker.lorem.word()
      }
    }
    return result
  }
  // Fallback
  return { fake: faker.lorem.word() }
}

// Forbidden keys (these will be checked in the schema to ensure that they aren't present).
const forbiddenKeys: string[] = [
  `$anchor`,
  `$comment`,
  `$defs`,
  `$dynamicAnchor`,
  `$dynamicRef`,
  `$id`,
  `$ref`,
  `$schema`,
  `$vocabulary`,
  `additionalProperties`,
  `allOf`,
  `anyOf`,
  `contentEncoding`,
  `contentMediaType`,
  `contentSchema`,
  `dependentRequired`,
  `dependentSchemas`,
  `deprecated`,
  `description`,
  `else`,
  `if`,
  `maxProperties`,
  `minProperties`,
  `not`,
  `oneOf`,
  `patternProperties`,
  `readOnly`,
  `then`,
  `title`,
  `unevaluatedItems`,
  `unevaluatedProperties`,
  `writeOnly`
]

// The server session: each connection will store the startup game string and a registry of actions.
export function createServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port })
  wss.on('connection', (ws) => {
    let startupReceived = false
    let sessionGame = ''
    const registeredActions = new Map<string, any>() // stores the complete action object keyed by name

    ws.on('message', (message) => {
      const msgString = message.toString()
      let parsedMessage: any
      try {
        parsedMessage = JSON.parse(msgString)
      } catch (e) {
        parsedMessage = null
      }

      // Enforce that, once startup has been processed, every packet must have the same game.
      if (
        startupReceived &&
        parsedMessage &&
        typeof parsedMessage.game === 'string'
      ) {
        if (parsedMessage.game !== sessionGame) {
          logOutput(
            'ERROR',
            `Game mismatch: expected "${sessionGame}" but got "${parsedMessage.game}".`
          )
          process.exit(1)
        }
      }

      // Step 1: Process startup packet (must always be the first packet).
      if (!startupReceived) {
        if (
          parsedMessage &&
          parsedMessage.command === 'startup' &&
          typeof parsedMessage.game === 'string'
        ) {
          startupReceived = true
          sessionGame = parsedMessage.game
          logOutput(
            'INFO',
            `Received valid startup packet for game "${sessionGame}".`
          )
        } else {
          logOutput(
            'ERROR',
            'First packet sent was not a valid startup packet.'
          )
        }
        return
      }

      // Step 2: Process actions/register packet.
      if (
        parsedMessage &&
        parsedMessage.command === 'actions/register' &&
        typeof parsedMessage.game === 'string' &&
        parsedMessage.data &&
        Array.isArray(parsedMessage.data.actions)
      ) {
        parsedMessage.data.actions.forEach((action: any) => {
          if (action.name) {
            // Check the provided schema for forbidden keys.
            if (
              action.schema &&
              typeof action.schema === 'object' &&
              action.schema.hasOwnProperty('properties')
            ) {
              for (let key in action.schema.properties) {
                if (forbiddenKeys.includes(key)) {
                  logOutput(
                    'WARN',
                    `Action "${action.name}" uses forbidden key: "${key}".`
                  )
                }
              }
            }
            registeredActions.set(action.name, action)
          }
        })
        logOutput(
          'INFO',
          `Registered Actions: ${Array.from(registeredActions.keys()).join(', ')}`
        )
        return
      }

      // Step 2.5: Process actions/unregister packet.
      if (
        parsedMessage &&
        parsedMessage.command === 'actions/unregister' &&
        typeof parsedMessage.game === 'string' &&
        parsedMessage.data &&
        Array.isArray(parsedMessage.data.action_names)
      ) {
        parsedMessage.data.action_names.forEach((actionName: string) => {
          if (registeredActions.has(actionName)) {
            registeredActions.delete(actionName)
          }
        })
        logOutput(
          'INFO',
          `Remaining Registered Actions: ${Array.from(registeredActions.keys()).join(', ')}`
        )
        return
      }

      // Step 3: Process actions/force packet.
      if (
        parsedMessage &&
        parsedMessage.command === 'actions/force' &&
        typeof parsedMessage.game === 'string' &&
        parsedMessage.data &&
        typeof parsedMessage.data.query === 'string' &&
        Array.isArray(parsedMessage.data.action_names)
      ) {
        const forcedActionNames: string[] = parsedMessage.data.action_names
        const validActions = forcedActionNames.filter((name) =>
          registeredActions.has(name)
        )
        const missingActions = forcedActionNames.filter(
          (name) => !registeredActions.has(name)
        )

        if (validActions.length === 0) {
          const errMsg = `Error: None of the forced actions are registered: ${forcedActionNames.join(', ')}`
          logOutput('ERROR', errMsg)
          return
        } else if (missingActions.length > 0) {
          const warnMsg = `Warning: Some forced actions not registered: ${missingActions.join(', ')}`
          logOutput('WARN', warnMsg)
        }

        // For each valid forced action, generate fake data based on its registered schema.
        const fakeResults: { [key: string]: any } = {}
        validActions.forEach((actionName) => {
          const action = registeredActions.get(actionName)
          const schema = action.schema || {}
          fakeResults[actionName] = generateFakeData(schema)
        })

        logOutput(
          'INFO',
          `Processed actions/force for actions: ${validActions.join(', ')}`
        )
        // Send back the "action" command with fake data.
        ws.send(
          JSON.stringify({
            command: 'action/result',
            game: sessionGame,
            data: fakeResults
          })
        )
        return
      }

      // For any other packet, simply log it.
      logOutput('INFO', `Received unhandled packet: ${msgString}`)
    })
  })
  return wss
}
