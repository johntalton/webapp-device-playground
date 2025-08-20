import { DOMTokenListLike } from '../util/dom-token-list.js'

//
import { WebServiceBuilder } from '../devcie-web/bus-service.js'

//
import { ExcameraI2CDriverUIBuilder } from '../devices-serial/exc-i2cdriver.js'
import { MCP2221UIBuilder } from '../devices-hid/mcp2221.js'
import { MashUIBuilder } from '../devices-serial/mash.js'

//
import { I2CDeviceBuilderFactory } from '../devices-i2c/device-factory.js'


import {
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_PRODUCT_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from '@johntalton/excamera-i2cdriver'
import { asyncEvent } from '../util/async-event.js'


const MCP2221_USB_FILTER = {
	vendorId: 1240,
	productId: 221
}

const isExcameraLabs = (vendorId, productId) => {
	//
	if(vendorId !== EXCAMERA_LABS_VENDOR_ID) { return false }

	//
	if(productId === EXCAMERA_LABS_PRODUCT_ID) { return true }
	if(productId === EXCAMERA_LABS_MINI_PRODUCT_ID) { return true }

	return false
}

export const UI_HOOKS = {
	addSerialPort,
	addUSBDevice,
	addHIDDevice,
	addI2CDevice,
	addWebDevice
}

export function buildDeviceSection(builder) {
	//
	const mainElem = document.querySelector('main')
	const { content } = mainElem?.querySelector(':scope > template')
	const clone = content.cloneNode(true)
	const sectionElem = clone.querySelector('section')

	const loadView = async () => {
		sectionElem.toggleAttribute('data-error', false)

		const customElem = await builder.buildCustomView()
		sectionElem.appendChild(customElem)
		sectionElem.toggleAttribute('data-loading', false)
	}

	const retryButton = sectionElem.querySelector('button[name="retryOpen"]')
	retryButton.addEventListener('click', asyncEvent(async event => {
		retryButton.disabled = true
		event.preventDefault()

		try {
			await builder.close()

			await builder.open()
			await loadView()
		}
		catch(e) {
			console.log('error re-opening view', e)
			sectionElem.toggleAttribute('data-loading', false)
			sectionElem.toggleAttribute('data-error', true)
		}

		retryButton.disabled = false
	}))

	Promise.resolve()
		.then(async () => builder.open())
		.then(loadView)
		.catch(e => {
			console.log('error opening view', e)
			sectionElem.toggleAttribute('data-loading', false)
			sectionElem.toggleAttribute('data-error', true)
		})

	return sectionElem
}

export function buildDeviceListItem(deviceListElem, builder) {
	const mainElem = document.querySelector('main')

	const { content } = deviceListElem?.querySelector(':scope > template')
	const clone = content.cloneNode(true)
	const liElem = clone.querySelector('li')
	const buttonElem = liElem.querySelector('button')

	buttonElem.textContent = builder.title

	const sectionElem = buildDeviceSection(builder)

	const lis = deviceListElem.querySelectorAll('li')
	const first = lis.length === 0

	if(first) {
		liElem.toggleAttribute('data-active', true)
		sectionElem.toggleAttribute('data-active', true)
	}

	deviceListElem.appendChild(liElem)
	mainElem.appendChild(sectionElem)

	//
	liElem.addEventListener('click', asyncEvent(async event => {
		if(event.shiftKey) {
			await builder.close(event.metaKey)
			liElem.remove()
			sectionElem.remove()
			return
		}

		const transitionView = () => {
			deviceListElem.querySelectorAll(':scope > li').forEach(li => {
				li.removeAttribute('data-active')
				const bElem = li.querySelector('button')
				bElem.disabled = false
			})

			liElem.toggleAttribute('data-active', true)
			buttonElem.disabled = true

			mainElem.querySelectorAll(':scope > section').forEach(s => s.removeAttribute('data-active'))

			sectionElem.toggleAttribute('data-active', true)
		}

		if(!document.startViewTransition) {
			transitionView()
		} else {
			const transition = document.startViewTransition(transitionView)
		}


	}), { once: false })

	// demolisher
	return () => {
		console.log('Demolisher for', builder.title)
		// virtualDevices.forEach(vdev => {
		// 	console.log(vdev)
		// })

		builder.close()
			.catch(e => console.warn(e))


		liElem.remove()
		sectionElem.remove()
	}
}

export function buildAsideToggle() {
	const toggleAsideButton = document.querySelector('button[data-aside-toggle]')
	toggleAsideButton?.addEventListener('click', event => {
		const viewDTL = new DOMTokenListLike(document.body.getAttributeNode('data-view'))

		viewDTL.toggle('aside')
	})
}

export async function hydrateUI() {
	buildAsideToggle()
}

export async function addSerialPort(port, signal) {
	const deviceListElem = document.getElementById('deviceList')
	const info =  port.getInfo()

	if(isExcameraLabs(info.usbVendorId, info.usbProductId)) {
		const builder = await ExcameraI2CDriverUIBuilder.builder(port, UI_HOOKS)
		const demolisher = buildDeviceListItem(deviceListElem, builder)

		signal?.addEventListener('abort', event => {
			console.log('Demolish SerialPort ExCamera Builder (signal):', signal.reason)
			demolisher()
		})

		if(signal === undefined) {
			// fallback to listing to port event
			port.addEventListener('disconnect', event => {
				console.log('Demolish SerialPort ExCamera Builder (port disconnect)')
				demolisher()
			})
		}
	}

	else if(true) {
		console.log('Assuming MASH fallback - for testing for now?')
		const builder = await MashUIBuilder.builder(port, UI_HOOKS)
		const demolisher = buildDeviceListItem(deviceListElem, builder)

		signal.addEventListener('abort', event => {
			console.log('signal said: abort - demo time')
			demolisher()
		})
	}


	//
	else {
		console.log('no driver for serial port', info)
	}
}

export async function addUSBDevice(device) {
	console.log('UI:addUSB', device)
}

export async function addHIDDevice(hid, signal) {
	const deviceListElem = document.getElementById('deviceList')

	const customProductId = 220 // for testing as mcp2221 allows setting this

	if(hid.vendorId === MCP2221_USB_FILTER.vendorId) {
		if(hid.productId === MCP2221_USB_FILTER.productId || hid.productId === customProductId) {

			const builder = await MCP2221UIBuilder.builder(hid, UI_HOOKS)
			const demolisher = buildDeviceListItem(deviceListElem, builder)

			signal.addEventListener('abort', event => {
				const { reason } = signal
				console.log('Demolish HID Builder (signal)', reason)
				demolisher()
			})

			return
		}
	}
	//console.log('no driver for usb device', device)
}

export async function addI2CDevice(definition) {
	const deviceListElem = document.getElementById('deviceList')

	const builder = await I2CDeviceBuilderFactory.from(definition, UI_HOOKS)
	const demolisher = buildDeviceListItem(deviceListElem, builder)

	definition.signal?.addEventListener('abort', event => {
		const { reason } = definition.signal
		console.log('Demolish I²C Builder (signal):', reason)
		demolisher()
	})

	if(definition.signal === undefined) {
		// fallback to listening to the port
		definition.port?.addEventListener('disconnect', event => {
			console.log('Demolish I²C Builder (port disconnect)')
			demolisher()
		})
	}

	return
}

export async function addWebDevice() {
	const deviceListElem = document.getElementById('deviceList')
	const builder = new WebServiceBuilder({}, UI_HOOKS)
	const demolisher = buildDeviceListItem(deviceListElem, builder)
}




// const transport = new WebTransport('https://localhost:4433/hid0')
// transport.ready.catch(e => console.warn('failed to establish connection', e))

// await transport.ready

// transport.closed
// 	.then(info => console.log('transport closed', info))
// 	.catch(e => console.warn('transport closed oddly', e))

// const source = await transport.createBidirectionalStream()

// const builder2 = await MCP2221UIBuilder.builder(undefined, UI_HOOKS, source)
// const demolisher = buildDeviceListItem(deviceListElem, builder2)

