import { MCP2221A, VoltageOff, Divider00375, GpioDirectionIn, GpioDirectionOut, Logic0, Logic1, Gp0DesignationGPIO, Gp1DesignationGPIO, Gp2DesignationGPIO, Gp3DesignationGPIO } from '@johntalton/mcp2221'
import { I2CBusMCP2221 } from '@johntalton/i2c-bus-mcp2221'
import { dumpHIDDevice } from '../util/hid-info.js'
import { range } from '../util/range.js'
import { deviceGuessByAddress } from '../devices-i2c/guesses.js'
import { delayMs} from '../util/delay.js'
import { HIDStreamSource } from '../util/hid-stream.js'
import { bindTabRoot } from '../util/tabs.js'
import { appendDeviceListItem } from '../util/device-list.js'
import { asyncEvent } from '../util/async-event.js'


	// const defaults = {
	// 	manufacturer: 'Microchip Technology Inc.',
	// 	product: 'MCP2221 USB-I2C/UART Combo',
	// 	serial: '0002137055'
	// }

export function makeHIDStreamBinding(hid) {
	const source = new HIDStreamSource(hid)

	return {
		async read(count) {
			if (source.readable === null) { throw new Error('null readable') }
			if (source.readable.locked) { throw new Error('locked reader') }

			const reader = source.readable.getReader({ mode: 'byob' })

			let buffer = new ArrayBuffer(count)
			let readBytes = 0

			try {
				while(readBytes < count) {
					const { value, done } = await reader.read(new Uint8Array(buffer, readBytes, count - readBytes))
					if(done) { break }

					buffer = value.buffer
					readBytes += buffer.byteLength

					if(readBytes >= count) { break }
				}
			}
			finally {
				reader.releaseLock()
			}

			return new Uint8Array(buffer, 0, readBytes)
		},

		async write(buffer) {
			const writer = source.writable.getWriter()
			try {
				await writer.write(buffer)
			}
			finally {
				await writer.ready
				writer.releaseLock()
			}
		}
	}
}

export class MCP2221UIBuilder {
	#hidDevice
	#device
	#ui
	#vbus

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

		const binding = makeHIDStreamBinding(this.#hidDevice)

		this.#device = await MCP2221A.from(binding)
		this.#vbus = I2CBusMCP2221.from(this.#device, {})

	}

	async close(forget = false) {
		if(forget) { await this.#hidDevice.forget() }
		return this.#hidDevice.close()
	}

	signature() {
		return `USB(${this.#hidDevice.vendorId},${this.#hidDevice.productId})`
	}

	async buildCustomView() {
		const response = await fetch('./custom-elements/mcp2221.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('mcp2221-config')
		if (root === null) { throw new Error('no root for template') }

		const statusButton = root.querySelector('button[data-status]')
		const resetButton = root.querySelector('button[data-reset]')
		const clearInterruptButton = root.querySelector('button[data-interrupt-clear]')

		const scanButton = root.querySelector('button[data-scan]')
		const cancelI2CButton = root.querySelector('button[data-cancel]')

		const addressElem = root.querySelector('addr-display[name="scanResults"]')
		const deviceList = root.querySelector('[data-device-list]')

		const busSpeedSelect = root.querySelector('select[name="busSpeed"]')


		const commonForm = root.querySelector('form[data-common]')

		const i2cInitializedOutput = commonForm?.querySelector('output[name="i2cInitialized"]')
		const i2cConfusedOutput = commonForm?.querySelector('output[name="i2cConfused"]')
		const i2cStateOutput = commonForm?.querySelector('output[name="i2cState"]')
		const i2cCancelledOutput = commonForm?.querySelector('output[name="i2cCancelled"]')
		const i2cClockOutput = commonForm?.querySelector('output[name="i2cClock"]')
		const addressOutput = commonForm?.querySelector('output[name="address"]')
		const requestedTransferLengthOutput = commonForm?.querySelector('output[name="requestedTransferLength"]')
		const transferredBytesOutput = commonForm?.querySelector('output[name="transferredBytes"]')
		const dataBufferCounterOutput = commonForm?.querySelector('output[name="dataBufferCounter"]')
		const communicationSpeedDividerOutput = commonForm?.querySelector('output[name="communicationSpeedDivider"]')
		const timeoutMsOutput = commonForm?.querySelector('output[name="timeoutMs"]')
		const sclOutput = commonForm?.querySelector('output[name="SCL"]')
		const sdaOutput = commonForm?.querySelector('output[name="SDA"]')
		const ackedOutput = commonForm?.querySelector('output[name="ACKed"]')
		const pendingValueOutput = commonForm?.querySelector('output[name="pendingValue"]')
		const hardwareRevisionOutput = commonForm?.querySelector('output[name="hardwareRevision"]')
		const firmwareRevisionOutput = commonForm?.querySelector('output[name="firmwareRevision"]')
		const setSpeedByteOutput = commonForm?.querySelector('output[name="setSpeedByte"]')
		const speedDividerByteOutput = commonForm?.querySelector('output[name="speedDividerByte"]')
		const setSpeedRequestedOutput = commonForm?.querySelector('output[name="setSpeedRequested"]')
		const setSpeedSuccessfulOutput = commonForm?.querySelector('output[name="setSpeedSuccessful"]')
		const interruptEdgeDetectorStateOutput = commonForm?.querySelector('output[name="interruptEdgeDetectorState"]')
		const ch0Output = commonForm?.querySelector('output[name="ch0"]')
		const ch1Output = commonForm?.querySelector('output[name="ch1"]')
		const ch2Output = commonForm?.querySelector('output[name="ch2"]')

		const flashForm = root.querySelector('form[data-flash]')
		const securitySelect = flashForm?.querySelector('select[name="security"]')
		const cdcSerialEmulationCheckbox = flashForm?.querySelector('input[name="cdcSerialEmulation"]')
		const clockDutyCycleSelect = flashForm?.querySelector('select[name="clockDutyCycle"]')
		const clockDividerSelect = flashForm?.querySelector('select[name="clockDivider"]')
		const interruptEdgeSelect = flashForm?.querySelector('select[name="interruptEdge"]')
		const usbManufacturerText = flashForm?.querySelector('input[name="usbManufacturer"]')
		const usbProductText = flashForm?.querySelector('input[name="usbProduct"]')
		const usbSNText = flashForm?.querySelector('input[name="usbSN"]')
		const factorySNText = flashForm?.querySelector('input[name="factorySN"]')
		const vendorIdText = flashForm?.querySelector('input[name="vendorId"]')
		const productIdText = flashForm?.querySelector('input[name="productId"]')
		const powerAttributeText = flashForm?.querySelector('input[name="powerAttribute"]')
		const mARequestedText = flashForm?.querySelector('input[name="mARequested"]')
		const uartLEDRxCheckbox = flashForm?.querySelector('input[name="uartLEDRx"]')
		const uartLEDTxCheckbox = flashForm?.querySelector('input[name="uartLEDTx"]')
		const i2cLEDCheckbox = flashForm?.querySelector('input[name="i2cLED"]')
		const SSPNDCheckbox = flashForm?.querySelector('input[name="SSPND"]')
		const USBCFGCheckbox = flashForm?.querySelector('input[name="USBCFG"]')

		const dacReferenceVoltageSelect = flashForm?.querySelector('select[name="dacReferenceVoltage"]')
		const dacReferenceOptionsSelect = flashForm?.querySelector('select[name="dacReferenceOptions"]')
		const dacInitialValueNumber = flashForm?.querySelector('input[name="dacInitialValue"]')
		const adcReferenceVoltageSelect = flashForm?.querySelector('select[name="adcReferenceVoltage"]')
		const adcReferenceOptionsSelect = flashForm?.querySelector('select[name="adcReferenceOptions"]')


		const gpio0Form = root.querySelector('form[data-gpio="0"]')
		const gpio0DesignationSelect = gpio0Form?.querySelector('select[name="designation"]')
		const gpio0DirectionSelect = gpio0Form?.querySelector('select[name="direction"]')
		const gpio0OutputValue = gpio0Form?.querySelector('select[name="outputValue"]')

		const gpio1Form = root.querySelector('form[data-gpio="1"]')
		const gpio1DesignationSelect = gpio1Form?.querySelector('select[name="designation"]')
		const gpio1DirectionSelect = gpio1Form?.querySelector('select[name="direction"]')
		const gpio1OutputValue = gpio1Form?.querySelector('select[name="outputValue"]')

		const gpio2Form = root.querySelector('form[data-gpio="2"]')
		const gpio2DesignationSelect = gpio2Form?.querySelector('select[name="designation"]')
		const gpio2DirectionSelect = gpio2Form?.querySelector('select[name="direction"]')
		const gpio2OutputValue = gpio2Form?.querySelector('select[name="outputValue"]')

		const gpio3Form = root.querySelector('form[data-gpio="3"]')
		const gpio3DesignationSelect = gpio3Form?.querySelector('select[name="designation"]')
		const gpio3DirectionSelect = gpio3Form?.querySelector('select[name="direction"]')
		const gpio3OutputValue = gpio3Form?.querySelector('select[name="outputValue"]')

		const passwordForm = root.querySelector('form[data-password]')
		const currentAccessPasswordOutput = passwordForm?.querySelector('output[name="currentAccessPassword"]')
		const accessPasswordText = passwordForm?.querySelector('input[name="accessPassword"]')
		const sendAccessPasswordButton = passwordForm?.querySelector('button[data-send-access-password]')

		const refreshStatus = async (options = {}) => {
			const {
				revision,
				i2c,
				adc,

				i2cInitialized,
				i2cConfused,
				i2cCancelled,
				i2cClock,
				i2cState,
				i2cStateName,

				setSpeedByte,
				speedDividerByte,
				setSpeedRequested,
				setSpeedSuccessful,
				interruptEdgeDetectorState
			} = await this.#device.common.status({
				opaque: 'status update',
				...options
			})

			const {
				address,
				requestedTransferLength,
				transferredBytes,
				dataBufferCounter,
				communicationSpeedDivider,
				timeoutMs,
				SCL, SDA, ACKed,
				pendingValue
			} = i2c

			const addressHex = `0x${address.toString(16).toUpperCase().padStart(2, '0')}`
			const address7RW = `0x${(address >> 1).toString(16).toUpperCase().padStart(2, '0')} ${((address & 0b1) === 1) ? 'Read' : 'Write'}`

			const { hardware, firmware } = revision
			hardwareRevisionOutput.value = `${hardware.major}.${hardware.minor}`
			firmwareRevisionOutput.value = `${firmware.major}.${firmware.minor}`


			const requestedFlag = setSpeedRequested ? (setSpeedSuccessful ? '👍' : '👎') : ''

			// setSpeedByteOutput.value = setSpeedByte
			// speedDividerByteOutput.value = speedDividerByte
			setSpeedRequestedOutput.value = setSpeedRequested
			setSpeedSuccessfulOutput.value = `${setSpeedSuccessful} ${requestedFlag}`

			//
			interruptEdgeDetectorStateOutput.value = `${interruptEdgeDetectorState ? '🔔' : '🔕'} (${interruptEdgeDetectorState})`


			function i2cClockTokHz(divider) {
				return Math.round(1 / ((divider + 2) / 12_000_000) / 1000)
			}

			const communicationSpeedkHz = i2cClockTokHz(communicationSpeedDivider)
			const annotationAboutSpeed = (communicationSpeedkHz < 50) ? '🐢' : (communicationSpeedkHz > 400) ? '🔥' : '✓'

			i2cConfusedOutput.value = `${i2cConfused} ${i2cConfused ? '🛑' : ''}`
			i2cInitializedOutput.value = `${i2cInitialized} ${i2cInitialized ? '' : '⚠️'}`
			i2cStateOutput.value = `${i2cStateName} (${i2cState})`
			i2cCancelledOutput.value = i2cCancelled
			i2cClockOutput.value = (i2cClock === undefined) ? '-' : `${i2cClock} (${i2cClockTokHz(i2cClock)} kHz)`
			addressOutput.value = `${addressHex} (${address7RW})`
			requestedTransferLengthOutput.value = requestedTransferLength
			transferredBytesOutput.value = transferredBytes
			dataBufferCounterOutput.value = dataBufferCounter
			communicationSpeedDividerOutput.value = `${communicationSpeedDivider} (${communicationSpeedkHz} kHz ${annotationAboutSpeed})`
			timeoutMsOutput.value = `${timeoutMs} Ms`
			sclOutput.value = SCL
			sdaOutput.value = SDA
			ackedOutput.value = ACKed
			pendingValueOutput.value = pendingValue


			ch0Output.value = adc.ch0
			ch1Output.value = adc.ch1
			ch2Output.value = adc.ch2


		}

		function _refreshConfig({
			chip, gp, usb,
			gpio0, gpio1, gpio2, gpio3
		}) {
			const { enabledCDCSerialEnumeration, security } = chip
			const { clock, dac, adc, interrupt } = gp
			const { dutyCycle, divider } = clock
			const { vendorId, productId, powerAttribute, mARequested } = usb

			//
			securitySelect.value = security
			cdcSerialEmulationCheckbox.checked = enabledCDCSerialEnumeration

			//
			clockDutyCycleSelect.value = dutyCycle
			clockDividerSelect.value = divider

			//
			interruptEdgeSelect.value = interrupt.edge

			//
			vendorIdText.value = vendorId
			productIdText.value = productId
			powerAttributeText.value = powerAttribute
			mARequestedText.value = mARequested

			//
			dacReferenceVoltageSelect.value = dac.referenceVoltage
			dacReferenceOptionsSelect.value = dac.referenceOptions
			dacInitialValueNumber.value = dac.initialValue
			adcReferenceVoltageSelect.value = adc.referenceVoltage
			adcReferenceOptionsSelect.value = adc.referenceOptions

			//
			_refreshGPIO({ gpio0, gpio1, gpio2, gpio3 })
		}

		const refreshSRAM = async () => {
			const {
				chip, gp, usb, password,
				gpio0, gpio1, gpio2, gpio3
			} = await this.#device.sram.get()

			const { uartLED, i2cLED, SSPND, USBCFG } = chip

			_refreshConfig({
				chip, gp, usb,
				gpio0, gpio1, gpio2, gpio3
			})

			//
			uartLEDRxCheckbox.checked = uartLED.rx === 'on'
			uartLEDTxCheckbox.checked = uartLED.tx === 'on'
			i2cLEDCheckbox.checked = i2cLED === 'on'
			SSPNDCheckbox.checked = SSPND === 'on'
			USBCFGCheckbox.checked = USBCFG === 'on'

			//
			currentAccessPasswordOutput.value = `"${password}"`

		}

		const refreshFlash = async () => {
			const { chip, gp, usb } = await this.#device.flash.readChipSettings()
			const { gpio0, gpio1, gpio2, gpio3 } = await this.#device.flash.readGPSettings()
			const { descriptor: manufacture } = await this.#device.flash.readUSBManufacturer()
			const { descriptor: product } = await this.#device.flash.readUSBProduct()
			const { descriptor: serialNumber } = await this.#device.flash.readUSBSerialNumber()
			const { descriptor: factorySerialNumber } = await this.#device.flash.readFactorySerialNumber()

			_refreshConfig({
				chip, gp, usb,
				gpio0, gpio1, gpio2, gpio3
			})

			//
			usbManufacturerText.value = manufacture
			usbProductText.value = product
			usbSNText.value = serialNumber
			factorySNText.value = factorySerialNumber
		}

		const _refreshGPIO = async ({ gpio0, gpio1, gpio2, gpio3 }) => {
			// console.log('_refreshGpio', { gpio0, gpio1, gpio2, gpio3 })

			function isDesignationGpio(designation) {
				return [
					Gp0DesignationGPIO,
					Gp1DesignationGPIO,
					Gp2DesignationGPIO,
					Gp3DesignationGPIO
				].includes(designation)
			}

			function _refreshSingleGPIO(gpio, gpioDesignationSelect, gpioDirectionSelect, gpioOutputValue) {
				if(gpio !== undefined) {
					if(gpio?.designation !== undefined) {
						const isGpio = isDesignationGpio(gpio.designation)

						gpioDesignationSelect.value = gpio.designation
						// gpioDirectionSelect.disabled = !isGpio
						// gpioOutputValue.disabled = !isGpio
					}

					if(gpio?.direction !== undefined) { gpioDirectionSelect.value = gpio.direction }
					if(gpio?.outputValue !== undefined) { gpioOutputValue.value = gpio.outputValue }
				}
			}

			_refreshSingleGPIO(gpio0, gpio0DesignationSelect, gpio0DirectionSelect, gpio0OutputValue)
			_refreshSingleGPIO(gpio1, gpio1DesignationSelect, gpio1DirectionSelect, gpio1OutputValue)
			_refreshSingleGPIO(gpio2, gpio2DesignationSelect, gpio2DirectionSelect, gpio2OutputValue)
			_refreshSingleGPIO(gpio3, gpio3DesignationSelect, gpio3DirectionSelect, gpio3OutputValue)
		}

		const refreshGPIO = async () => {
			const results = await this.#device.gpio.get()
			return _refreshGPIO(results)
		}






		flashForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()


			const changeGroupElem = event.target.closest('[data-change-group]')
			if(changeGroupElem === null) {
				// flash update
				console.log('non change group')
				return
			}

			const changeGroup = changeGroupElem.getAttribute('data-change-group')

			if(changeGroup === 'interrupt') {
				const edge = interruptEdgeSelect.value

				console.log('set edge', edge)
				await this.#device.sram.set({ gp: { interrupt: { edge, clear: false }} })
				await refreshSRAM()
			}
			else if(changeGroup === 'clock') {
				const dutyCycle = clockDutyCycleSelect.value
				const divider = clockDividerSelect.value

				console.log('setting clock', { dutyCycle, divider })
				await this.#device.sram.set({ clock: { dutyCycle, divider } })
				await refreshSRAM()
			}
			else if(changeGroup === 'dac') {
				// todo whatChange === initial value fast path
				const referenceVoltage = dacReferenceVoltageSelect.value
				const referenceOptions = dacReferenceOptionsSelect.value
				const initialValue = parseInt(dacInitialValueNumber.value)

				await this.#device.sram.set({ gp: { dac: {
					referenceVoltage,
					referenceOptions,
					initialValue
				} } })
				await refreshSRAM()
			}
			else if(changeGroup === 'adc') {
				const referenceVoltage = adcReferenceVoltageSelect.value
				const referenceOptions = adcReferenceOptionsSelect.value

				await this.#device.sram.set({ gp: { adc: {
					referenceVoltage,
					referenceOptions
				} } })
				await refreshSRAM()
			}
			else { console.warn('unknown change group', changeGroup) }

		}))

		const gpioForms = [
			{ form: gpio0Form, name: 'gpio0' },
			{ form: gpio1Form, name: 'gpio1' },
			{ form: gpio2Form, name: 'gpio2' },
			{ form: gpio3Form, name: 'gpio3' }
		]

		for(const { form, name } of gpioForms) {
			form?.addEventListener('change', asyncEvent(async event => {
				event.preventDefault()
				const whatChanged = event.target.getAttribute('name')

				if(whatChanged === 'designation') {
					console.log('update designation',  gpio0DesignationSelect.value)
					await this.#device.sram.set({
						gpio0: {
							designation: gpio0DesignationSelect.value,
							direction: gpio0DirectionSelect.value === 'in' ? GpioDirectionIn : GpioDirectionOut,
							outputValue: gpio0OutputValue.value === '1' ? Logic1 : Logic0
						},
						gpio1: {
							designation: gpio1DesignationSelect.value,
							direction: gpio1DirectionSelect.value === 'in' ? GpioDirectionIn : GpioDirectionOut,
							outputValue: gpio1OutputValue.value === '1' ? Logic1 : Logic0
						},
						gpio2: {
							designation: gpio2DesignationSelect.value,
							direction: gpio2DirectionSelect.value === 'in' ? GpioDirectionIn : GpioDirectionOut,
							outputValue: gpio2OutputValue.value === '1' ? Logic1 : Logic0
						},
						gpio3: {
							designation: gpio3DesignationSelect.value,
							direction: gpio3DirectionSelect.value === 'in' ? GpioDirectionIn : GpioDirectionOut,
							outputValue: gpio3OutputValue.value === '1' ? Logic1 : Logic0
						},
					})

					await refreshSRAM()
				}
				else
				{
					const directionSelect = form?.querySelector('select[name="direction"]')
					const outputValueText = form?.querySelector('select[name="outputValue"]')

					const direction = directionSelect.value === 'in' ? GpioDirectionIn : GpioDirectionOut
					const outputValue = outputValueText.value === '1' ? Logic1 : Logic0

					console.log('setting gpio', name, direction, outputValue)

					const result = await this.#device.gpio.set({
						[name]: {
							direction,
							outputValue
						}
					})

					await _refreshGPIO(result)
					await refreshGPIO()
				}

			}))
		}

		busSpeedSelect?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			const speed = parseInt(busSpeedSelect.value)

			await refreshStatus({ i2cClock: speed })
		}))

		clearInterruptButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()
			clearInterruptButton.disabled = true

			await this.#device.sram.set({ gp: { interrupt: { clear: true } } })
			await refreshStatus()

			clearInterruptButton.disabled = false
		}))

		sendAccessPasswordButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			sendAccessPasswordButton.disabled = true

			const password = accessPasswordText.value

			await this.#device.flash.sendPassword({ password })
			await refreshSRAM()

			sendAccessPasswordButton.disabled = false
		}))

		scanButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			scanButton.disabled = true

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())

			// await refreshStatus({ i2cClock: 100 })
			// await delayMs(100)
			let first = true

			const futureScans = [ ...range(0x08, 0x77) ].map(addr => {
				return async () => {
					if(!first) {
						const status = await this.#device.common.status({ cancelI2c: true })
					}

					first = false

					const result = await this.#device.i2c.writeData({ address: addr, buffer: Uint8Array.from([  ]) })
					const statusAfter = await this.#device.common.status()
					const acked = statusAfter.i2cState === 0
					return { addr, acked }
				}
			})

			const serializeScan = futureScans.reduce((past, futureFn) => {
				return past.then(async pastResults => {
					const futureResults = await futureFn()
					return [ ...pastResults, futureResults ]
				})
			}, Promise.resolve([]));

			const scanResults = await serializeScan

			// clear after scan
			const status = await this.#device.common.status({ cancelI2c: true })
			console.log('state after scan', status)

			const ackedList = scanResults.filter(({ _addr, acked }) => acked)
			// console.log(ackedList)


			//
			ackedList.forEach(({ addr, acked }) => {

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

					this.#ui.addI2CDevice({
						type: deviceGuess,
						bus: this.#vbus,
						address: addr,
						port: undefined
					})


				}, { once: true })

			})

			scanButton.disabled = false


		}), { once: false })

		resetButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			resetButton.dissabled = true

			await this.#device.common.reset()

			resetButton.disabled = false
		}), { once: false })

		statusButton.addEventListener('click', asyncEvent(async event => {
			statusButton.disabled = true

			await refreshStatus()

			statusButton.disabled = false
		}))

		cancelI2CButton?.addEventListener('click', asyncEvent(async event => {
			cancelI2CButton.disabled = true

			await refreshStatus({ opaque: 'user cancel', cancelI2c: true })

			cancelI2CButton.disabled = false

		}))

		bindTabRoot(root)

		await refreshFlash()
		await refreshSRAM()
		await refreshGPIO()
		await refreshStatus()

		return root
	}
}

