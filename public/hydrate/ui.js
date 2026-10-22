import { DOMTokenListLike } from '../util/dom-token-list.js'
//

import { WebServiceBuilder } from '../devcie-web/bus-service.js'
//

import { MCP2221UIBuilder } from '../devices-hid/mcp2221.js'
import { ExcameraI2CDriverUIBuilder } from '../devices-serial/exc-i2cdriver.js'
import { MashUIBuilder } from '../devices-serial/mash.js'
//

import { I2CDeviceBuilderFactory } from '../devices-i2c/device-factory.js'
//

// import {
// 	DEFAULT_CH9102F_VENDOR_ID,
// 	DEFAULT_CH9102F_PRODUCT_ID
// } from '@johntalton/ch9102F'
import {
	EXCAMERA_LABS_MINI_PRODUCT_ID,
	EXCAMERA_LABS_PRODUCT_ID,
	EXCAMERA_LABS_VENDOR_ID,
} from '@johntalton/excamera-i2cdriver'
import {
	DEFAULT_FT232H_PRODUCT_ID,
	DEFAULT_FT232R_PRODUCT_ID,
	DEFAULT_FTDI_VENDOR_ID,
} from '@johntalton/ftdi'
import { FTDIUIBuilder } from '../devices-usb/ftdi.js'
import { asyncEvent } from '../util/async-event.js'
import { dumpUSBDevice } from '../util/usb-info.js'
import {
	DEFAULT_CH9102F_PRODUCT_ID,
	DEFAULT_CH9102F_VENDOR_ID
} from './usb.js'

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
	const { content } = mainElem.querySelector(':scope > template')
	const clone = content.cloneNode(true)
	const sectionElem = clone.querySelector('section')

	const loadView = async () => {
		sectionElem.toggleAttribute('data-loading', true)
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

	const { content } = deviceListElem.querySelector(':scope > template')
	const clone = content.cloneNode(true)
	const liElem = clone.querySelector('li')
	const buttonElem = liElem.querySelector('button')

	const titleElem = buttonElem.querySelector('[data-title]')
	const subtitleElem = buttonElem.querySelector('[data-subtitle]')

	// buttonElem.textContent = builder.title
	titleElem.textContent = builder.title
	// subtitleElem.textContent = '(test)'

	const observationController = new AbortController()
	if('when' in builder) {
		builder.when('subtitle')
			.map(e => e.detail)
			.subscribe(value => {
				console.log('Subtitle Observation', value)
				subtitleElem.textContent = `(${value})`
			}, { signal: observationController.signal })
	}
	else if('addEventListener' in builder) {
		builder.addEventListener('subtitle', event => {
			console.log('Subtitle Event', event)
			const value = event.detail
			subtitleElem.textContent = `(${value})`
		}, { signal: observationController.signal })
	}

	const sectionElem = buildDeviceSection(builder)

	const lis = deviceListElem.querySelectorAll('li')
	const first = lis.length === 0

	if(first) {
		buttonElem.disabled = true
		liElem.toggleAttribute('data-active', true)
		sectionElem.toggleAttribute('data-active', true)
	}

	deviceListElem.appendChild(liElem)
	mainElem.appendChild(sectionElem)

	//
	const demolisher = async (forget = false) => {
		console.log('Demolisher for', builder.title)

		observationController.abort('demolisher')

		builder.close(forget)
			.then(() => console.log('Devices closed', builder.title))
			.catch(e => console.warn('Close failure', builder.title, e))

		liElem.remove()
		sectionElem.remove()
	}

	//
	liElem.addEventListener('click', asyncEvent(async event => {
		if(event.shiftKey) {
			// await builder.close(event.metaKey)
			// liElem.remove()
			// sectionElem.remove()

			await demolisher(event.metaKey)

			return
		}

		const transitionView = () => {
			deviceListElem.querySelectorAll(':scope > li').forEach(li => {
				li.removeAttribute('data-active')
				const bElem = li.querySelector('button')
				bElem.disabled = false
			})

			mainElem.querySelectorAll(':scope > section').forEach(s => s.removeAttribute('data-active'))

			buttonElem.disabled = true
			liElem.toggleAttribute('data-active', true)
			sectionElem.toggleAttribute('data-active', true)
		}

		if(!document.startViewTransition) {
			transitionView()
		} else {
			const transition = document.startViewTransition(transitionView)
		}


	}), { once: false })

	return demolisher
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

export async function addUSBDevice(device, signal) {
	console.log('UI:addUSB', device)
	const deviceListElem = document.getElementById('deviceList')

	// isFTDI
	if(device.vendorId === DEFAULT_FTDI_VENDOR_ID) {
		if(device.productId === DEFAULT_FT232H_PRODUCT_ID || device.productId === DEFAULT_FT232R_PRODUCT_ID) {
			const builder = await FTDIUIBuilder.builder(device, UI_HOOKS)
			const demolisher = buildDeviceListItem(deviceListElem, builder)

			signal?.addEventListener('abort', event => {
				const { reason } = signal
				console.log('Demolish USB Builder (signal)', reason)
				demolisher()
			})

			return
		}
	} else if(device.vendorId === DEFAULT_CH9102F_VENDOR_ID) {
		if(device.productId === DEFAULT_CH9102F_PRODUCT_ID) {
			console.log('CH9102F builder')
			dumpUSBDevice(device)
			// const builder = await CH9102FBuilder.builder(device, UI_HOOKS)
			// const demolisher = buildDeviceListItem(deviceListElem, builder)

			// signal?.addEventListener('abort', event => {
			// 	const { reason } = signal
			// 	console.log('Demolish USB Builder (signal)', reason)
			// 	demolisher()
			// })

			return
		}
	}


	console.log('unknown USB device')
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

