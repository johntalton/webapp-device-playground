// import { MCP2111_USB_FILTER } from '../devices-usb/mcp2111a.js'
export const MCP2111_HID_FILTER = { vendorId: 1240, productId: 221 }

export const SUPPORTED_HID_FILTER = [
	MCP2111_HID_FILTER,
	{ vendorId: 1240, productId: 220 } // for testing productId change feature
]

/**
 * @param {Map} knownDevices
 */
async function addHIDDevice(ui, device, knownDevices) {
	if(knownDevices.has(device)) {
		console.log('HID: re-adding existing paired device')
		return
	}

	console.log('HID: New')

	const controller = new AbortController()
	const { signal } = controller

	knownDevices.set(device, { controller })

	return ui.addHIDDevice(device, signal)
}

async function hydrateHIDBackgroundDevices(addDevice) {
	const devices = await navigator.hid.getDevices()
	devices.forEach(addDevice)
}


async function hydrateHIDEvents(addDevice, knownDevices) {
	navigator.hid.addEventListener('connect', event => {
		const { device } = event

		// async off into nothing
		addDevice(device)
			.catch(e => console.warn(e))
	})

  navigator.hid.addEventListener('disconnect', event => {
		const { device } = event

		if(!knownDevices.has(device)) {
			console.log('Navigator.HID Disconnect Event: unknown device')
			return
		}

		const { controller } = knownDevices.get(device)
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