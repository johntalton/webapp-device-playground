import { DOMTokenListLike } from '../util/dom-token-list.js'
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
	addI2CDevice
}

export function buildDeviceSection(builder) {
	//
	const mainElem = document.querySelector('main')
	const { content } = mainElem?.querySelector(':scope > template')
	const clone = content.cloneNode(true)
	const sectionElem = clone.querySelector('section')


	Promise.resolve()
		.then(async () => builder.open())
		.then(async () => {
			sectionElem.toggleAttribute('data-error', false)

			const controller = new AbortController()
			const signal = controller.signal

			const customElem = await builder.buildCustomView({ signal })
			sectionElem.appendChild(customElem)
			sectionElem.toggleAttribute('data-loading', false)
		})
		.catch(e => {
			sectionElem.toggleAttribute('data-error', true)
			console.error('error building view', e)
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

	deviceListElem.appendChild(liElem)
	mainElem.appendChild(sectionElem)

	//
	liElem.addEventListener('click', e => {
		const transition = document.startViewTransition(() => {
			deviceListElem.querySelectorAll(':scope > li').forEach(li => {
				li.removeAttribute('data-active')
				const bElem = li.querySelector('button')
				bElem.disabled = false
			})

			liElem.toggleAttribute('data-active', true)
			buttonElem.disabled = true

			mainElem.querySelectorAll(':scope > section').forEach(s => s.removeAttribute('data-active'))

			sectionElem.toggleAttribute('data-active', true)
		})
	}, { once: false })

	// demolisher
	return () => {

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
	// console.log('addSerialPort')

	const info =  port.getInfo()

	// console.log(info)

	//
	if(isExcameraLabs(info.usbVendorId, info.usbProductId)) {
		// console.log('adding excamera i2cdriver', port)

		const builder = await ExcameraI2CDriverUIBuilder.builder(port, UI_HOOKS)
		const demolisher = buildDeviceListItem(deviceListElem, builder)

		signal.addEventListener('abort', event => {
			console.log('signal said: abort - demo time')
			demolisher()
		})

		// port.addEventListener('disconnect', event => {
		// 	console.log('Excamera device disconnect - demo time', this)
		// 	demolisher()
		// })
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

export async function addHIDDevice(hid) {
	const deviceListElem = document.getElementById('deviceList')
	console.log('UI:addHID', hid.serialNumber, hid.productName, hid)

	if(hid.vendorId === MCP2221_USB_FILTER.vendorId) {
		if(hid.productId == MCP2221_USB_FILTER.productId) {
			//console.log('adding mcp2221', hid)

			const builder = await MCP2221UIBuilder.builder(hid, ui)
			buildDeviceListItem(deviceListElem, builder)
			return
		}
	}
	//console.log('no driver for usb device', device)
}

export async function addI2CDevice(definition) {
	const deviceListElem = document.getElementById('deviceList')
	// console.log('i2c device to list', definition)
	const builder = await I2CDeviceBuilderFactory.from(definition, UI_HOOKS)
	const demolisher = buildDeviceListItem(deviceListElem, builder)

	definition.port?.addEventListener('disconnect', event => {
		console.log('I²C device disconnect - demo time', this)
		demolisher()
	})

	return
}

