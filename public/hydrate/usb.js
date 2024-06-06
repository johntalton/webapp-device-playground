import { FT232H_PRODUCT_ID, FT232H_VENDOR_ID } from '../devices-usb/ft232h.js'
//
// export const FT232H_USB_FILTER = { vendorId: FT232H_VENDOR_ID, productId: FT232H_PRODUCT_ID }

const CH9012F_VENDOR_ID = 6790
const CH9102F_PRODUCT_ID = 21972
export const CH9102F_USB_FILTER = { vendorId: CH9012F_VENDOR_ID, productId: CH9102F_PRODUCT_ID }

export const SUPPORTED_USB_FILTER = [
	// FT232H_USB_FILTER,
	CH9102F_USB_FILTER
]

const isFT232H = (vendorId, productId) => {
	//
	if(vendorId !== FT232H_VENDOR_ID) { return false }

	//
	if(productId === FT232H_PRODUCT_ID) { return true }

	return false
}


function hydrateUSBWorker() {
	const usbWorker = new Worker('./workers/usb-worker.js', { type: 'module' })
	usbWorker.onmessage = event => {
		const { data: message } = event
		const { type, info, port } = message

		console.log('main: message from usb worker', type)

		if(type === 'usb-added' && isFT232H(info.vendorId, info.productId)) {

			console.log('main: added FT232H message', info, port)

			port.onmessage = event => {
				console.log('main: ft port message', event)
			}

			//const liElem = makeListItem()
			// Promise.resolve()
			// 	.then(async () => {
			// 		const builder = await FT232HUIBuilder.builder(port, ui)
			// 		const demolisher = buildDeviceListItem(deviceListElem, builder)
			// 	})
		}
	}

	usbWorker.postMessage({ type: 'scan' })
}


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


// requestUSBButton.disabled = true
// requestUSBButton.addEventListener('click', event => {
// 	const all = event?.altKey
// 	const filters = all ? [] : SUPPORTED_USB_FILTER

// 	navigator.usb.requestDevice({ filters })
// 		.then(device => {
// 			console.log('user selected a device', device)
// 			usbWorker.postMessage({ type: 'scan' })
// 		})
// 		.catch(e => console.warn(e.message))


// }, { once: false })

//
export async function hydrateUSB(requestUSBButton, ui) {
	const devlist = []
	const add = device => ui.addUSBDevice(device)

	return Promise.all([
		hydrateUSBReqeustButton(requestUSBButton, add)
	])
}
