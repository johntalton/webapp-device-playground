import { delayMs } from '../util/delay.js'

// import { MCP2111_USB_FILTER } from '../devices-usb/mcp2111a.js'
export const MCP2111_HID_FILTER = { vendorId: 1240, productId: 221 }

export const SUPPORTED_HID_FILTER = [
	MCP2111_HID_FILTER,
	{ vendorId: 1240, productId: 220 } // for testing productId change feature
]



/**
 * @param {Map<string, any>} knownDevices
 */
async function addHIDDevice(ui, device, knownDevices) {
	const key = `${device.vendorId}-${device.productId}`

	console.log('HID: Lock', key)
	const state = await navigator.locks.query()
	console.log(state)

	const { promise, resolve, reject } = Promise.withResolvers()
	navigator.locks.request(key, { mode: 'exclusive', signal: AbortSignal.timeout(100) }, async lock => {
		console.log('lock status', lock)


		if(knownDevices.has(key)) {
			console.log('HID: re-adding existing paired device')
			return
		}

		console.log('HID: New')

		const controller = new AbortController()
		const { signal } = controller
		signal.addEventListener('abort', e => resolve(true))

		knownDevices.set(key, { device, controller })

		await ui.addHIDDevice(device, signal)


		return promise
	})
	.catch(e => console.log('lock error', e))



}

async function hydrateHIDBackgroundDevices(addDevice) {
	const devices = await navigator.hid.getDevices()
	devices.forEach(addDevice)
}


/**
 * @param {Map<string, any>} knownDevices
 */
async function hydrateHIDEvents(addDevice, knownDevices) {
	navigator.hid.addEventListener('connect', event => {
		const { device } = event

		// async off into nothing
		addDevice(device)
			.catch(e => console.warn(e))
	})

  navigator.hid.addEventListener('disconnect', event => {
		const { device } = event

		const key = `${device.vendorId}-${device.productId}`

		if(!knownDevices.has(key)) {
			console.log('Navigator.HID Disconnect Event: unknown device')
			return
		}

		const { controller } = knownDevices.get(key)
		knownDevices.delete(key)
		controller.abort('HID Disconnect')

	})
}

function requestHIDHandler(addDevice, event) {
	const all = event?.altKey
	const filters = all ? [] : SUPPORTED_HID_FILTER

	navigator.hid.requestDevice({ filters })
		.then(devices => devices.forEach(addDevice))
		.catch(e => console.log('issues requesting hid device', e))
}

const build_requestHIDHandler = addDevice => event => requestHIDHandler(addDevice, event)

async function hydrateHIDRequestButton(requestHIDButton, addDevice) {
	requestHIDButton.addEventListener('click', build_requestHIDHandler(addDevice), { once: false })
	requestHIDButton.disabled = false
}

export async function hydrateHID(requestHIDButton, ui) {
	const knownDevices = new Map()
	const add = device => addHIDDevice(ui, device, knownDevices)

	return Promise.all([
		hydrateHIDBackgroundDevices(add),
		hydrateHIDEvents(add, knownDevices),
		hydrateHIDRequestButton(requestHIDButton, add)
	])
}

