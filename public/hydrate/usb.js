import { FT232H_PRODUCT_ID, FT232H_VENDOR_ID } from '../devices-usb/ft232h.js'

export const FT232H_USB_FILTER = { vendorId: FT232H_VENDOR_ID, productId: FT232H_PRODUCT_ID }

export const SUPPORTED_USB_FILTER = [
	FT232H_USB_FILTER
]

//
async function requestUSBDevice(filters) {
	return navigator.usb.requestDevice({ filters })
}

function requestUSBPHandler(add, event) {
	const all = event?.altKey
	const filters = all ? [] : SUPPORTED_USB_FILTER

	requestUSBDevice(filters)
		.then(add)
		.catch(e => console.log('issues requesting device', e.message))
}

const build_requestUSBHandler = add => event => requestUSBPHandler(add, event)

async function hydrateUSBReqeustButton(requestUSBButton, add) {
	requestUSBButton.addEventListener('click', build_requestUSBHandler(add), { once: false })
	requestUSBButton.disabled = false
}

//
export async function hydrateUSB(requestUSBButton, ui) {
	const devlist = []
	const add = device => ui.addUSBDevice(device)

	return Promise.all([
		hydrateUSBReqeustButton(requestUSBButton, add)
	])
}
