import { FT232H_PRODUCT_ID, FT232H_VENDOR_ID } from '../devices-usb/ft232h.js'

export const FT232H_USB_FILTER = { vendorId: FT232H_VENDOR_ID, productId: FT232H_PRODUCT_ID }

export const SUPPORTED_USB_FILTER = [
	FT232H_USB_FILTER
]

async function addUSBDevice(ui, device, devlist) {
	if(devlist.includes(device)) {
		console.log('re-adding existing paired device ... ')
		return
	}

	devlist.push(device)

	console.log('add usb device')

	return ui.addUSBDevice(device)
}

async function hydrateUSBBackgroundDevices(addDevice) {
	const devices = await navigator.usb.getDevices()
	devices.forEach(addDevice)
}

const handleUSBConnect = e => console.log(e)
const handleUSBDisconnect = e => console.log(e)

async function hydrateUSBEvents(addDevice) {
	navigator.usb.addEventListener('connect', handleUSBConnect)
  navigator.usb.addEventListener('disconnect', handleUSBDisconnect)
}

async function requestUSBDevice(filters) {
	return navigator.usb.requestDevice({ filters })
}

function requestUSBPHandler(addDevice, event) {
	const all = event?.altKey
	const filters = all ? [] : SUPPORTED_USB_FILTER

	requestUSBDevice(filters)
		.then(addDevice)
		.catch(e => console.log('issues requesting device', e.message))
}

const build_requestUSBHandler = addDevice => event => requestUSBPHandler(addDevice, event)

async function hydrateUSBReqeustButton(requestUSBButton, addDevice) {
	requestUSBButton.addEventListener('click', build_requestUSBHandler(addDevice), { once: false })
	requestUSBButton.disabled = false
}

export async function hydrateUSB(requestUSBButton, ui) {
	const devlist = []
	const add = device => addUSBDevice(ui, device, devlist)

	return Promise.all([
		hydrateUSBBackgroundDevices(add),
		hydrateUSBEvents(add),
		hydrateUSBReqeustButton(requestUSBButton, add)
	])
}