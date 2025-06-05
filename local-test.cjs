process.env.INPUT_PORT = '8080'
process.env.INPUT_TESTFILE = ''
process.env.INPUT_RUNNER = 'python'
process.env.INPUT_PACKET_LIST = './__fixtures__/packets.valid.json'

require('./dist/index.js')
