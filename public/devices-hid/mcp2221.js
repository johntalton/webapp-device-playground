import { MCP2221A } from '@johntalton/mcp2221'
import { I2CBusMCP2221 } from '@johntalton/i2c-bus-mcp2221'
import { dumpHIDDevice } from '../util/hid-info.js'
import { range } from '../util/range.js'
import { deviceGuessByAddress } from '../devices-i2c/guesses.js'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

async function onceInputReport(hid, timeoutMs) {
	return new Promise((resolve, reject) => {
		const tout = setTimeout(() => reject(new Error('HID input report timedout')), timeoutMs)
		hid.addEventListener('inputreport', e => {
			clearTimeout(tout)
			resolve(e)
		}, { once: true })
	})
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

		dumpHIDDevice(this.#hidDevice)

		const binding = {
			read: async length => {
				// console.log('usbRead', length)

				// this is a risky approuch as the binding to the
				// single trigger event may be added after the
				// actaully importreport event has been triggered
				// this should be more coupled with the write command
				// and, like other usb wappers, expos a transfer function
				const { returnValue, reportId, data, device } = await onceInputReport(this.#hidDevice, 5000)
				if(reportId !== 0) { throw new Error('always reprot zero') }
				if(!returnValue) { throw new Error('no return value') }
				return data.buffer
			},
			write: async bufferSource => {
				// console.log('usbWrite', bufferSource)
				await this.#hidDevice.sendReport(0, bufferSource)
				return bufferSource.bytesLength
			}
		}

		this.#device = await MCP2221A.from(binding)
		//await this.#device.common.reset()

		// const status = await this.#device.common.status({  })
		// console.log({ status })

		// const speed = await this.#device.common.status({ i2cClock: 50 })
		// console.log({ speed })

		//
		await this.#device.sram.set({
			inturrupt: { clear: true }
		})

		// const sramGet = await this.#device.sram.get()
		// console.log({ sramGet })
	}

	async close() {
		return this.#hidDevice.close()
	}

	signature() {
		return `USB(${this.#hidDevice.vendorId},${this.#hidDevice.productId})`
	}

	async buildCustomView() {
		const root = document.createElement('mcp2221-config')

		const resetI2CButton = document.createElement('button')
		resetI2CButton.textContent = 'reset 📡'
		resetI2CButton.setAttribute('slot', 'i2c-controls')
		root.appendChild(resetI2CButton)


		const addressElem = document.createElement('addr-display')
		addressElem.setAttribute('slot', 'scan-display')
		root.appendChild(addressElem)

		// <button>scan </button>
		const scanButton = document.createElement('button')
		scanButton.textContent = 'scan 📡'
		scanButton.setAttribute('slot', 'i2c-controls')
		root.appendChild(scanButton)

		scanButton.addEventListener('click', e => {
			scanButton.disabled = true

			console.log('mcp2221 testing ...')

			Promise.resolve()
				.then(async () => {


					// const speed = await this.#device.common.status({ i2cClock: 50 })
					// console.log({ speed })


					const futureScans = [ ...range(0x08, 0x77) ].map(addr => {
						return async () => {
							const status = await this.#device.common.status({ cancelI2c: true })
							const result = await this.#device.i2c.writeData({ address: addr, buffer: Uint8Array.from([ 0x00 ]) })
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

						listElem.toggleAttribute('data-acked', true)

						const guesses = deviceGuessByAddress(addr)
						const guessSelectElem = document.createElement('select')
						guessSelectElem.disabled = (guesses.length <= 1)
						guesses.forEach(guess => {
							const guessOptionElem = document.createElement('option')
							guessOptionElem.textContent = guess.name
							guessSelectElem.appendChild(guessOptionElem)
						})

						const makeDeviceButton = document.createElement('button')
						makeDeviceButton.textContent = 'Create Device 🕹'
						listElem.appendChild(makeDeviceButton)
						makeDeviceButton.addEventListener('click', e => {

							//
							const deviceGuess = guessSelectElem.value
							const vbus = I2CBusMCP2221.from(this.#device, {})

							this.#ui.addI2CDevice({
								type: deviceGuess,
								bus: vbus,
								address: addr
							})


						}, { once: true })

						listElem.setAttribute('slot', 'vdevice-guess-list')
						listElem.appendChild(guessSelectElem)

						root.appendChild(listElem)
					})


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


		}, { once: true })

		resetI2CButton.addEventListener('click', e => {
			Promise.resolve()
				.then(async () => {


					const can = await this.#device.common.status({ cancelI2c: true })
					console.log({  can  })
					// await delayMs(100)

					// const speed = await this.#device.common.status({ i2cClock: 100 })
					// console.log({ speed })
					// await delayMs(100)

					//await this.#device.common.status({ cancelI2c: true })

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

		return root
	}
}