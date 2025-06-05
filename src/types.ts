export interface StartupPacket {
  command: 'startup'
  game: string
}

export interface RegisterPacket {
  command: 'actions/register'
  game: string
  data: {
    actions: Array<{
      name: string
      description: string
      schema?: object
    }>
  }
}

export interface UnregisterPacket {
  command: 'actions/unregister'
  game: string
  data: {
    action_names: string[] // normalized from spec typo
  }
}

export interface ContextPacket {
  command: 'context'
  game: string
  data: {
    message: string
    silent: boolean
  }
}

export interface ActionForcePacket {
  command: 'actions/force'
  game: string
  data: {
    state?: string
    query: string
    ephemeral_context: boolean
    actions: string[]
  }
}

export interface ShutdownReadyPacket {
  command: 'shutdown/ready'
  game: string
}

export type IncomingPacket =
  | StartupPacket
  | RegisterPacket
  | UnregisterPacket
  | ContextPacket
  | ActionForcePacket
  | ShutdownReadyPacket
