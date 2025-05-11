import { JSONSchema7 } from 'json-schema'

export interface _StartupPacket {
  command: 'startup'
  game: string
}

export interface _ContextPacket {
  command: 'context'
  game: string
  data: {
    message: string
    silent: boolean
  }
}

export interface Action {
  name: string
  description: string
  schema?: JSONSchema7 | {}
}

export interface _ActionsRegister {
  command: 'actions/register'
  game: string
  data: {
    actions: Action[]
  }
}

export interface _ActionsUnregister {
  command: 'actions/unregister'
  game: string
  data: {
    action_names: string[]
  }
}

export interface _ActionForce {
  command: 'actions/force'
  game: string
  data: {
    state?: string
    query: string
    ephermeral_context?: boolean // default: false
    action_names: string[]
  }
}

export interface _ActionResult {
  command: 'action/result'
  game: string
  data: {
    id: string
    success: boolean
    message?: string
  }
}

export interface ActionCommand {
  command: 'action'
  data: {
    id: string
    name: string
    data?: string
  }
}

/**
 * All packets below this block of comment are proposed packets that aren't widely used yet, but discussions are potentially happening regarding them.
 * If users use any of these, warn in console that they are proposed and not part of the official specification yet.
 */

export interface ReregisterActions {
  command: 'actions/reregister_all'
}

// If these commands are used by the server or client, warn in the console that these are part of the game automation API which shouldn't need to be implemented by most games

export interface GracefulShutdown {
  command: 'shutdown/graceful'
  data: {
    wants_shutdown: boolean // true -> shutdown will be happening, false -> shutdown should be cancelled
  }
}

export interface ImmediateShutdown {
  command: 'shutdown/immediate'
}

export interface _ShutdownReady {
  command: 'shutdown/ready'
  game: string
}
