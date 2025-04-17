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
import { asyncEvent } from '../util/async-event.js'
import { deviceGuessByAddress } from '../devices-i2c/guesses.js'
import { appendDeviceListItem } from '../util/device-list.js'


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

	const loadView = async () => {
		sectionElem.toggleAttribute('data-error', false)

		const controller = new AbortController()
		const signal = controller.signal

		const customElem = await builder.buildCustomView({ signal })
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

export async function addHIDDevice(hid, signal) {
	////////
	// return

	const deviceListElem = document.getElementById('deviceList')
	// console.log('UI:addHID', hid)

	if(hid.vendorId === MCP2221_USB_FILTER.vendorId) {
		if(hid.productId === MCP2221_USB_FILTER.productId || hid.productId === 220) {
			//console.log('adding mcp2221', hid)

			const builder = await MCP2221UIBuilder.builder(hid, UI_HOOKS)
			const demolisher = buildDeviceListItem(deviceListElem, builder)

			signal.addEventListener('abort', event => {
				const { reason } = signal
				console.log(`signal abort on hid mcp2221 (${reason}) - run ui demolisher`)
				demolisher()
			})


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
		console.log('I²C device disconnect - run ui demolisher', this)
		demolisher()
	})

	definition.signal?.addEventListener('abort', event => {
		const { reason } = definition.signal
		console.log(`I²C device signaled disconnect (${reason}) - run ui demolisher`)
		demolisher()
	})

	return
}



// export class I2CBusWeb {
// 	#url

// 	constructor(url = 'http://localhost:3000/port') {
// 		this.#url = url
// 	}

// 	get name() { return `WebI²C(${this.#url})`}

// 	async postCommand(command, options) {
// 		try {
// 			const response = await fetch(this.#url, {
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/json',
// 				},
// 				body: JSON.stringify({
// 					namespace: window.origin,
// 					opaque: '🤷🏻‍♂️',
// 					type: command,
// 					...options
// 				})
// 			})

// 			if(!response.ok) { throw new Error(`response not ok ${response.status}`) }

// 			const result = await response.json()

// 			if(result.type === 'error') {
// 				throw new Error('WebI²C Remote Error: ' + result.why)
// 			}

// 			return {
// 				...result,
// 				buffer: (result.buffer !== undefined) ? Uint8Array.from(result.buffer) : undefined
// 			}
// 		}
// 		catch(e) {
// 			// console.warn('fetch exception', e)
// 			throw e
// 		}
// 	}

// 	async scan() {
// 		const { ackedList } = await this.postCommand('scan', {})
// 		return ackedList
// 	}

// 	async readI2cBlock(address, cmd, length, target) {
// 		return this.postCommand('readI2cBlock', {
// 			address,
// 			cmd,
// 			length
// 		})
// 	}

// 	async writeI2cBlock(address, cmd, length, buffer) {
// 		return this.postCommand('writeI2cBlock', {
// 			address,
// 			cmd,
// 			length,
//       buffer: [ ...buffer ]
// 		})
// 	}

// 	async i2cRead(address, length, target) {
// 		return this.postCommand('i2cRead', {
// 			address,
// 			length
// 		})
//   }

//   async i2cWrite(address, length, buffer) {
//     return this.postCommand('i2cWrite', {
// 			address,
// 			length,
//       buffer: [ ...buffer ]
// 		})
//   }
// }

// addI2CDevice({
// 	type: 'ht16k33',
// 	address: 0x71,
// 	bus: new I2CBusWeb()
// })

const deviceListElem = document.getElementById('deviceList')
const builder = {
	title: '☠️',
	open() {

	},
	async buildCustomView() {
		const response = await fetch('./custom-elements/web.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('web-config')
		if (root === null) { throw new Error('no root for template') }

		const urlText = root.querySelector('input[name="url"]')
		const scanButton = root.querySelector('button[data-scan]')
		const deviceList = root.querySelector('[data-device-list]')
		const addressElem = root.querySelector('addr-display[name="scanResults"]')

		scanButton?.addEventListener('click', asyncEvent(async event => {
			scanButton.disabled = true

			const bus = new I2CBusWeb(urlText.value)

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())


			try {
				const ackedList = await bus.scan()

				ackedList.forEach(addr => {
					const acked = true


					const hexElem = document.createElement('hex-display')

					hexElem.setAttribute('slot', addr)

					hexElem.toggleAttribute('acked', true)
					// hexElem.toggleAttribute('arbitration', arbitration)
					// hexElem.toggleAttribute('timedout', timedout)

					hexElem.textContent = addr.toString(16).padStart(2, '0')

					addressElem.append(hexElem)

					//
					const listElem = document.createElement('li')
					listElem.textContent = addr

					listElem.setAttribute('slot', 'vdevice-guess-list')
					listElem.toggleAttribute('data-acked', true)

					const guesses = deviceGuessByAddress(addr)
					const item = appendDeviceListItem(deviceList, addr, { acked, guesses })

					item.button.addEventListener('click', e => {
						e.preventDefault()

						//
						item.button.disabled = true
						const deviceGuess = item.select.value

						const controller = new AbortController()
						const { signal } = controller

						UI_HOOKS.addI2CDevice({
							type: deviceGuess,
							bus,
							address: addr,

							port: undefined,
							signal
						})


					}, { once: true })

				})
			}
			catch(e) {
				console.log(e)
			}

			scanButton.disabled = false
		}))

		return root
	}
}
// const demolisher = buildDeviceListItem(deviceListElem, builder)






// const transport = new WebTransport('https://localhost:4433/hid0')
// transport.ready.catch(e => console.warn('failed to establish connection', e))

// await transport.ready

// transport.closed
// 	.then(info => console.log('transport closed', info))
// 	.catch(e => console.warn('transport closed oddly', e))

// const source = await transport.createBidirectionalStream()

// const builder2 = await MCP2221UIBuilder.builder(undefined, UI_HOOKS, source)
// const demolisher = buildDeviceListItem(deviceListElem, builder2)

