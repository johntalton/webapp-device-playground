// import { MCP2111_USB_FILTER } from '../devices-usb/mcp2111a.js'
export const MCP2111_HID_FILTER = { vendorId: 1240, productId: 221 }

export const SUPPORTED_HID_FILTER = [
	MCP2111_HID_FILTER
]

async function addHIDDevice(ui, device, knownDevices) {
	if(knownDevices.includes(device)) {
		console.log('HID:addHIDDevice: re-adding existing paired device ... ')
		return
	}

	knownDevices.push(device)

	return ui.addHIDDevice(device)
}

async function hydrateHIDBackgroundDevices(addDevice) {
	const devices = await navigator.hid.getDevices()
	devices.forEach(addDevice)
}

const handleHIDConnect = e => console.log(e)
const handleHIDDisconnect = e => console.log(e)

async function hydrateHIDEvents(addDevice) {
	navigator.hid.addEventListener('connect', handleHIDConnect)
  navigator.hid.addEventListener('disconnect', handleHIDDisconnect)
}

async function requestHIDDevice(filters) {
	return navigator.hid.requestDevice({ filters })
}

function requestHIDHandler(addDevice, event) {
	const all = event?.altKey
	const filters = all ? [] : SUPPORTED_HID_FILTER

	requestHIDDevice(filters)
		.then(devices => devices.forEach(addDevice))
		.catch(e => console.log('issues requesting hid device', e))
}

const build_requestHIDHandler = addDevice => event => requestHIDHandler(addDevice, event)

async function hydrateHIDReqeustButton(requestHIDButton, addDevice) {
	requestHIDButton.addEventListener('click', build_requestHIDHandler(addDevice), { once: false })
	requestHIDButton.disabled = false
}

export async function hydrateHID(requestHIDButton, ui) {
	const knownDevices = []
	const add = device => addHIDDevice(ui, device, knownDevices)

	return Promise.all([
		hydrateHIDBackgroundDevices(add),
		hydrateHIDEvents(add),
		hydrateHIDReqeustButton(requestHIDButton, add)
	])
}