import { MCP2221A, VoltageOff, Divider00375 } from '@johntalton/mcp2221'
import { I2CBusMCP2221 } from '@johntalton/i2c-bus-mcp2221'
import { dumpHIDDevice } from '../util/hid-info.js'
import { range } from '../util/range.js'
import { deviceGuessByAddress } from '../devices-i2c/guesses.js'
import { delayMs} from '../util/delay.js'

class WaitableQueue {
	#latchResolve = () => {}
	#dataLatch
	#dataQ = []

	constructor() {
		this.#dataLatch = new Promise(this.#pendingLatchFor())
	}

	#pendingLatchFor() {
		return (resolve, _reject) => {
			this.#latchResolve = data => {
				resolve(data)
				this.#dataLatch = new Promise(this.#pendingLatchFor())
			}
		}
	}

	push(data) {
		this.#dataQ.push(data)
		this.#latchResolve(data)
	}

	pull() {
		if(this.#dataQ.length > 0) {
			return this.#dataQ.splice(0)[0] // remove from array (modifies array) and index into single result - yuk
		}

		return undefined
	}

	get waitForPull() { return this.#dataLatch }
}

class BindingFactory {
	static from(hidDevice) {
		const REPORT_ID = 0
		const waitableQueue = new WaitableQueue()

		hidDevice.addEventListener('inputreport', e => {
			const { returnValue, reportId, data, device } = e

			waitableQueue.push({
				reportId, returnValue,
				data
			})
		})

		return {
			read: async length => {
				const READ_TIMEOUT_MS = 1000

				const optimisticItem = waitableQueue.pull()
				if(optimisticItem !== undefined) {
					if(optimisticItem.data.byteOffset !== 0) { console.warn('returning buffer from view with non-zero offset') }
					return optimisticItem.data.buffer
				}

				let timer = undefined
				const timeoutRejectMs = (ms) => new Promise((resolve, reject) => { timer = setTimeout(reject, ms, new Error('timeout')) })

				await Promise.race([timeoutRejectMs(READ_TIMEOUT_MS), waitableQueue.waitForPull])

				clearTimeout(timer)

				const item = waitableQueue.pull()
				if(item === undefined) { throw new Error('no data after wait?') }
				if(item.data.byteOffset !== 0) { console.warn('returning buffer from view with non-zero offset') }
				return item.data.buffer
			},
			write: async bufferSource => {
				// console.log('xfer', bufferSource)
				return hidDevice.sendReport(REPORT_ID, bufferSource)
			}
		}
	}

	// async function onceInputReport(hid, timeoutMs) {
	// 	return new Promise((resolve, reject) => {
	// 		const tout = setTimeout(() => reject(new Error('HID input report timedout')), timeoutMs)
	// 		hid.addEventListener('inputreport', e => {
	// 			clearTimeout(tout)
	// 			resolve(e)
	// 		}, { once: true })
	// 	})
	// }
	// const binding = {
	// 	read: async length => {
	// 		// console.log('usbRead', length)

	// 		// this is a risky approuch as the binding to the
	// 		// single trigger event may be added after the
	// 		// actaully importreport event has been triggered
	// 		// this should be more coupled with the write command
	// 		// and, like other usb wappers, expos a transfer function
	// 		const { returnValue, reportId, data, device } = await onceInputReport(this.#hidDevice, 5000)
	// 		if(reportId !== 0) { throw new Error('always reprot zero') }
	// 		if(!returnValue) { throw new Error('no return value') }
	// 		return data.buffer
	// 	},
	// 	write: async bufferSource => {
	// 		// console.log('usbWrite', bufferSource)
	// 		await this.#hidDevice.sendReport(0, bufferSource)
	// 		return bufferSource.bytesLength
	// 	}
	// }
}

export class MCP2221UIBuilder {
	#hidDevice
	#device
	#ui

	static async builder(hidDevice, ui) {
		return new MCP2221UIBuilder(hidDevice, ui)
	}

	constructor(hidDevice, ui) {
		this.#hidDevice = hidDevice
		this.#ui = ui
	}

	get title() { return this.#hidDevice.productName }

	async open() {


		await this.#hidDevice.open()

		//dumpHIDDevice(this.#hidDevice)

		const binding = BindingFactory.from(this.#hidDevice)
		this.#device = await MCP2221A.from(binding)

		//await this.#device.common.reset()

		const status = await this.#device.common.status({ })
		console.log({ status })
		// await delayMs(100)

		if(status.i2cState !== 0) {
			console.log('cancle on open')
			const result = await this.#device.common.status({ cancelI2c: true })
			console.log({ result })
			await delayMs(100)
		}

		// const speed = await this.#device.common.status({ opaque: '', i2cClock: 100 })
		// console.log({ speed })
		// await delayMs(100)




		// const speed = await this.#device.common.status({ i2cClock: 100 })
		// console.log({ speed })

		//
		// await this.#device.sram.set({
		// 	inturrupt: { clear: true }
		// })

		// await this.#device.flash.writeGPSettings({
		// 	gpio0: {
		// 		outputValue: 0,
		// 		direction: 'in',
		// 		designation: 'Gpio'
		// 	},
		// 	gpio1: {
		// 		outputValue: 0,
		// 		direction: 'in',
		// 		designation: 'Gpio'
		// 	},
		// 	gpio2: {
		// 		outputValue: 0,
		// 		direction: 'in',
		// 		designation: 'Gpio'
		// 	},
		// 	gpio3: {
		// 		outputValue: 0,
		// 		direction: 'in',
		// 		designation: 'Gpio'
		// 	}
		// })

		// await this.#device.gpio.set({
		// 	gpio0: { direction: 'in' },
		// 	gpio1: { direction: 'in' },
		// 	gpio2: { direction: 'in' },
		// 	gpio3: { direction: 'in' }
		// })

		// const sramGet = await this.#device.sram.get()
		// console.log({ sramGet })


		// await this.#device.flash.writeChipSettings({
		// 	chip: {
		// 		enabledCDCSerialEnumeration: true,
		// 		security: 'unsecured'
		// 	},
		// 	gp: {
		// 		clock: { dutyCycle: '25%', divider: Divider00375 },
		// 		dac: { referenceVoltage: VoltageOff, referenceOptions: 'Vdd' },
		// 		adc: { referenceVoltage: VoltageOff, referenceOptions: 'Vdd' },
		// 		interrupt: { edge: 'Off' }
		// 	},
		// 	usb: {
		// 		vendorId: 1240,
		// 		productId: 221,
		// 		powerAttribute: 0,
		// 		mARequested: 0
		// 	},
		// 	password: ''
		// })

		// const cs = await this.#device.flash.readChipSettings()
		// const gps = await this.#device.flash.readGPSettings()
		// const usbM = await this.#device.flash.readUSBManufacturer()
		// const usbP = await this.#device.flash.readUSBProduct()
		// const usbSN = await this.#device.flash.readUSBSerialNumber()
		// const fsn = await this.#device.flash.readFactorySerialNumber()

		// const sram = await this.#device.sram.get()

		// console.log({
		// 	cs,
		// 	gps,// usbM, usbP, usbSN, fsn,
		// 	sram
		// })
	}

	async close() {
		return this.#hidDevice.close()
	}

	signature() {
		return `USB(${this.#hidDevice.vendorId},${this.#hidDevice.productId})`
	}

	async buildCustomView() {
		const root = document.createElement('mcp2221-config')

		const tabs = document.createElement('div')
		tabs.setAttribute('slot', 'i2c-tabs')
		tabs.classList.add('tabs')

		const resetI2CButton = document.createElement('button')
		resetI2CButton.textContent = 'reset'
		resetI2CButton.setAttribute('slot', 'i2c-controls')
		tabs.appendChild(resetI2CButton)

		const statusI2CButton = document.createElement('button')
		statusI2CButton.textContent = 'status'
		statusI2CButton.setAttribute('slot', 'i2c-controls')
		tabs.appendChild(statusI2CButton)

		const cancelI2CButton = document.createElement('button')
		cancelI2CButton.textContent = 'cancel'
		cancelI2CButton.setAttribute('slot', 'i2c-controls')
		tabs.appendChild(cancelI2CButton)

		const scanButton = document.createElement('button')
		scanButton.textContent = 'scan'
		scanButton.setAttribute('slot', 'i2c-controls')
		tabs.appendChild(scanButton)

		root.appendChild(tabs)

		const addressElem = document.createElement('addr-display')
		addressElem.setAttribute('slot', 'scan-display')
		root.appendChild(addressElem)

		scanButton.addEventListener('click', e => {
			scanButton.disabled = true

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())

			console.log('mcp2221 scan...')


			Promise.resolve()
				.then(async () => {

					await this.#device.common.status({ i2cClock: 400 })

					const futureScans = [ ...range(0x08, 0x77) ].map(addr => {
						return async () => {
							const status = await this.#device.common.status({ cancelI2c: true })
							// await delayMs(1)
							const result = await this.#device.i2c.writeData({ address: addr, buffer: Uint8Array.from([ 0x00 ]) })
							// await delayMs(1)
							const statusAfter = await this.#device.common.status({ cancelI2c: false })
							return { addr, acked: statusAfter.i2cState === 0 }
						}
					})

					const serializeScan = futureScans.reduce((past, futureFn) => {
						return past.then(async pastResults => {
							const futureResults = await futureFn()
							return [ ...pastResults, futureResults ]
						})
					}, Promise.resolve([]));

					const scanResuts = await serializeScan


					const ackedList = scanResuts.filter(({ _addr, acked }) => acked)
					console.log(ackedList)


					//
					ackedList.forEach(({ addr, _acked }) => {

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
						const guessSelectElem = document.createElement('select')
						guessSelectElem.disabled = (guesses.length <= 1)
						guesses.forEach(guess => {
							const guessOptionElem = document.createElement('option')
							guessOptionElem.textContent = guess.name
							guessSelectElem.appendChild(guessOptionElem)
						})
						listElem.appendChild(guessSelectElem)

						const makeDeviceButton = document.createElement('button')
						makeDeviceButton.textContent = 'Create Device 🕹'
						makeDeviceButton.disabled = (guesses.length === 0)
						listElem.appendChild(makeDeviceButton)

						makeDeviceButton.addEventListener('click', e => {
							//
							console.log('making Virtual Bus from MCP2221')
							const deviceGuess = guessSelectElem.value
							const vbus = I2CBusMCP2221.from(this.#device, {})

							this.#ui.addI2CDevice({
								type: deviceGuess,
								bus: vbus,
								address: addr,
								port: undefined
							})


						}, { once: true })

						root.appendChild(listElem)
					})

					scanButton.disabled = false

					// const result = await this.#device.sram.set({
					// 	// clock: {
					// 	// 	dutyCycle: '25%',
					// 	// 	divider: '375 kHz'
					// 	// },

					// 	gp: {
					// 		// dac: {
					// 		// 	referenceVoltage: '4.096V',
					// 		// 	referenceOptions: 'Vrm',
					// 		// 	initialValue: 31
					// 		// },
					// 		// adc: {},
					// 		interrupt: { clear: true }
					// 	},

					// 	gpio0: {
					// 		designation: 'SSPND',
					// 		direction: 'in'
					// 	},

					// 	// gpio0: {
					// 	// 	designation: 'ADC_1',
					// 	// 	direction: 'in'
					// 	// },

					// 	gpio1: {
					// 		designation: 'Interrupt Detection',
					// 		direction: 'in'
					// 	},

					// 	// gpio1: {
					// 	// 	designation: 'Clock Output',
					// 	// 	direction: 'out'
					// 	// }
					// 	// gpio1: {
					// 	// 	designation: 'ADC1',
					// 	// 	direction: 'in'
					// 	// },

					// 	gpio2: {
					// 		designation: 'ADC2',
					// 		direction: 'in'
					// 	},

					// // // 	gpio3: {
					// // // 		designation: 'LED I2C',
					// // // 		direction: 'out'
					// // // 	}

					// 	gpio3: {
					// 		designation: 'DAC2',
					// 		direction: 'out',
					// 		outputValue: 1
					// 	}

					// })
					// console.log(result)



					// for(let i = 0; i < 60; i++) {
					// 	const initialValue =  (i % 10) + 22
					// 	await this.#device.sram.set({ gp: { dac: { initialValue } } })
					//   await delayMs(75)
					// 	//const stat = await this.#device.sram.get()
					// 	//console.log(stat)
					// }


					// const sramGet = await this.#device.sram.get()
					// console.log(sramGet)


					// const gpioInfo = await this.#device.gpio.get()
					// console.log(gpioInfo)

					// const status = await this.#device.common.status({ })
					// console.log({ status })




					// const status11 = await this.#device.common.status({ i2cClock: 400 })
					// console.log({ status11 })

					// const status1 = await this.#device.common.status({ cancelI2c: false, })
					// console.log({ status1 })


					// const result1 = await this.#device.i2c.writeData({
					// 	address: 0x77,
					// 	buffer: Uint8Array.from([ 0xD0 ])
					// })

					// console.log({ result1 })

					// const status2 = await this.#device.common.status()
					// console.log({ status2 })

					// //const status2 = await this.#device.common.status({ i2cClock: 200 })
					// const result2 = await this.#device.i2c.readData({
					// 			address: (0x77 << 1),
					// 			length: 1
					// 		})

					// console.log({ result2 })

					// for await(const address of range(0x08, 0x77)) {
					// 	const result = await this.#device.i2c.readData({
					// 		address: address << 1,
					// 		length: 1
					// 	})
					// 	console.log(address, result)
					// }
				})

			// const vbus =  I2CBusMCP2221.from(this.#device, { opaquePrefix: 'mcp2221:s:' })

			// ui.addI2CDevice({
			// 	type: '',
			// 	bus: vbus
			// })


		}, { once: false })

		resetI2CButton.addEventListener('click', e => {
			Promise.resolve()
				.then(async () => {

					await this.#device.common.reset()
					// await this.#hidDevice.close()
					// await this.#hidDevice.open()

					// const can = await this.#device.common.status({ cancelI2c: true })
					// console.log({  can  })
					// await delayMs(100)

					// const speed = await this.#device.common.status({ i2cClock: 100 })
					// console.log({ speed })
					// await delayMs(100)

					// if(speed.i2cState !== 0) {
					// 	await this.#device.common.status({ cancelI2c: true })
					// }

					// const wresult = await this.#device.i2c.writeData({ address: 0x77, buffer: Uint8Array.from([ 0x00 ]) })
					// console.log(wresult)

					// for(let i = 0; i < 10; i += 1) {
					// 	await delayMs(100)
						// const statis = await this.#device.common.status()
						// console.log(statis)
					// }

					// const result = await this.#device.i2c.readData({ address: 0x77, length: 1 })
					// console.log(result)

					// const data = await this.#device.i2c.readGetData()
					// console.log(data)





					// const defaults = {
					// 	manufacturer: 'Microchip Technology Inc.',
					// 	product: 'MCP2221 USB-I2C/UART Combo',
					// 	serial: '0002137055'
					// }

					// const cs = await this.#device.flash.readChipSettings()
					// console.log(cs)

					// const gs = await this.#device.flash.readGPSettings()
					// console.log(gs)

					// const um = await this.#device.flash.readUSBManufacturer()
					// const up = await this.#device.flash.readUSBProduct()
					// const us = await this.#device.flash.readUSBSerialNumber()
					// const fsn = await this.#device.flash.readFactorySerialNumber()
					// console.log({ um, up, us, fsn })


					// const prod = '<b>MCP2221</b>'
					// await this.#device.flash.writeUSBProduct({ descriptor: prod })
					// const afterP = await this.#device.flash.readUSBProduct()
					// console.log(afterP)

					// const str = '👩🏻‍❤️‍💋‍👩🏻'
					// await this.#device.flash.writeUSBManufacturer({ descriptor: str })
					// const afterM = await this.#device.flash.readUSBManufacturer()
					// console.log(afterM)


				})
		}, { once: false })

		statusI2CButton.addEventListener('click', e => {
			statusI2CButton.disabled = true

			Promise.resolve()
				.then(async () => {

					const status = await this.#device.common.status({ opaque: 'status update' })
					console.log(status)

					const cs = await this.#device.flash.readChipSettings()
					const gp = await this.#device.flash.readGPSettings()
					const um = await this.#device.flash.readUSBManufacturer()
					const up = await this.#device.flash.readUSBProduct()
					const us = await this.#device.flash.readUSBSerialNumber()
					const fsn = await this.#device.flash.readFactorySerialNumber()

					statusI2CButton.disabled = false
				})
		})

		cancelI2CButton.addEventListener('click', e => {
			cancelI2CButton.disabled = true

			Promise.resolve()
				.then(async () => {

					const status = await this.#device.common.status({ opaque: 'user cancel', cancelI2c: true })
					console.log(status)

					cancelI2CButton.disabled = false
				})
		})

		return root
	}
}