

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

await chip.common.status({ i2cClock: 400 })

//
const channel = new MessageChannel()
const mbus = I2CBusMCP2221.from(chip, { opaquePrefix: 'AsAService' })
const service = I2CPortService.from(channel.port2, mbus)
const pbus = await I2CPortBus.openPromisified(channel.port1)
