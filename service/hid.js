
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import HID from 'node-hid'


import { MCP2221 } from '@johntalton/mcp2221'
import { I2CBusMCP2221 } from '@johntalton/i2c-bus-mcp2221'
import { I2CPort, I2CPortBus, I2CPortService } from '@johntalton/i2c-port'
import { NodeHIDStreamSource } from './node-hid-stream.js'

const VENDOR_ID = 1240
const PRODUCT_ID = 221

function addDevice(device) {
	const controller = new AbortController()
	const { signal } = controller

	// add
	console.log('add', device)
}

async function hydrateHIDBackgroundDevices() {
	const devices = await HID.devicesAsync(VENDOR_ID, PRODUCT_ID)
	devices.forEach(addDevice)
}

async function hydrateHID() {
	return Promise.all([
		hydrateHIDBackgroundDevices()
	])
}

await hydrateHID()



const device = await HID.HIDAsync.open(VENDOR_ID, PRODUCT_ID)
const source = new NodeHIDStreamSource(device)
const chip = MCP2221.from(source)

chip.common.status({ i2cClock: 400 })

//
const channel = new MessageChannel()
const mbus = I2CBusMCP2221.from(chip, { opaquePrefix: 'AsAService' })
const service = I2CPortService.from(channel.port2, mbus)
const pbus = await I2CPortBus.openPromisified(channel.port1)

//
const busMap = new Map()
busMap.set('mcp', {
	bus(req) { return I2CBusMCP2221.from(chip, { opaquePrefix: req.body.namespace + '::' + req.body.opaque }) }
})
busMap.set('port', { bus(req) { return pbus }})

const e = express()
e.use(bodyParser.json())
e.use(cors())

e.options('/:id', cors())
e.post('/:id', async (request, response) => {

  const config = busMap.get(request.params.id)
  if(config === undefined) {
		response.status(404)
    response.json({ error: 'unknown id' })
    return
  }

	const bus = config.bus(request)

  const message = {
    ...request.body,
    buffer: (request.body.buffer !== undefined) ? Uint8Array.from( request.body.buffer ) : undefined
  }
  const result = await I2CPort.handleMessage(bus, message)
  response.json({
		name: bus.name,
    ...result,
    buffer: (result.buffer !== undefined) ? [ ...(new Uint8Array(result.buffer)) ] : undefined
  })
})

e.listen(3000)
