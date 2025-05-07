import { WebSocketServer } from 'ws'

export function createServer(port: number): WebSocketServer {
    // Create a new WebSocket server
    const wss = new WebSocketServer({ port })
    wss.on('connection', ws => {
        ws.on('message', message => {
            // Handle incoming messages according to your protocol
            console.log(`Received message => ${message}`)
            ws.send('Message received!')
        })
    })
    return wss
}