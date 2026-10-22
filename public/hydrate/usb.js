import {
	DEFAULT_FT232H_PRODUCT_ID,
	DEFAULT_FT232R_PRODUCT_ID,
	DEFAULT_FTDI_VENDOR_ID,
} from '@johntalton/ftdi'
//
export const FT232H_USB_FILTER = { vendorId: DEFAULT_FTDI_VENDOR_ID, productId: DEFAULT_FT232H_PRODUCT_ID }
export const FT232R_USB_FILTER = { vendorId: DEFAULT_FTDI_VENDOR_ID, productId: DEFAULT_FT232R_PRODUCT_ID  }


export const DEFAULT_CH9102F_VENDOR_ID = 6790
export const DEFAULT_CH9102F_PRODUCT_ID = 21972
export const CH9102F_USB_FILTER = { vendorId: DEFAULT_CH9102F_VENDOR_ID, productId: DEFAULT_CH9102F_PRODUCT_ID }

export const SUPPORTED_USB_FILTER = [
	FT232H_USB_FILTER,
	FT232R_USB_FILTER,
	CH9102F_USB_FILTER
]


// function hydrateUSBWorker() {
// 	const usbWorker = new Worker('./workers/usb-worker.js', { type: 'module' })
// 	usbWorker.onmessage = event => {
// 		const { data: message } = event
// 		const { type, info, port } = message

// 		console.log('main: message from usb worker', type)

// 		if(type === 'usb-added' && isFT232H(info.vendorId, info.productId)) {

// 			console.log('main: added FT232H message', info, port)

// 			port.onmessage = event => {
// 				console.log('main: ft port message', event)
// 			}

// 			//const liElem = makeListItem()
// 			// Promise.resolve()
// 			// 	.then(async () => {
// 			// 		const builder = await FTDIUIBuilder.builder(port, ui)
// 			// 		const demolisher = buildDeviceListItem(deviceListElem, builder)
// 			// 	})
// 		}
// 	}

// 	usbWorker.postMessage({ type: 'scan' })
// }

/**
 * @param {Array<Object>} knownDevices
 */
function addUSBDevice(ui, device, knownDevices) {
	if(knownDevices.includes(device)) {
		console.log('USB Device is Know')
		return
	}

	console.log('Adding USB Device', device)
	knownDevices.push(device)

	const controller = new AbortController()
	const { signal } = controller

	navigator.usb.addEventListener('disconnect', event => {
		if(event.device !== device) {
			//
			return
		}

		const index = knownDevices.indexOf(device)
		if(index >= 0) { knownDevices.splice(index, 1) }


		console.log('USB Device disconnected', event.device)
		controller.abort('usb disconnect')
	})

	ui.addUSBDevice(device, signal)
}


async function hydrateUSBBackgroundDevices(add) {
	const devices = await navigator.usb.getDevices()
	console.log('existing paired devices', devices)
	devices.forEach(add)
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

async function hydrateUSBRequestButton(requestUSBButton, add) {
	requestUSBButton.addEventListener('click', build_requestUSBHandler(add), { once: false })
	requestUSBButton.disabled = false
}


async function hydrateUSBEvents(add) {
	navigator.usb.addEventListener('connect', event => {
		const { device } = event
		console.log('usb connect', device)

		add(device)
			// .catch(e => console.warn('USB add device error on connect', e))
	})
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
	const add = device => addUSBDevice(ui, device, devlist)

	return Promise.all([
		hydrateUSBEvents(add),
		hydrateUSBBackgroundDevices(add),
		hydrateUSBRequestButton(requestUSBButton, add)
	])
}
