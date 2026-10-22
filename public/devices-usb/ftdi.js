// import { ADT7410 } from '@johntalton/adt7410'
// import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { I2CTransactionBus } from '@johntalton/and-other-delights'
import {
	BIT_MODE,
	CLOCK_DEFAULT_FAST_MODE_400_kHz,
	CLOCK_DEFAULT_FAST_MODE_PLUS_1_MHz,
	CLOCK_DEFAULT_HIGH_SPEED_MODE_3_4_MHz,
	CLOCK_DEFAULT_ULTRA_FAST_MODE_5_MHz,
	FTDIDevice,
	FTDIEEPROM,
	Util
} from '@johntalton/ftdi'
import { FT232HBus } from '@johntalton/ftdi/i2c'
import { deviceGuessByAddress } from '../devices-i2c/guesses.js'
import { asyncEvent } from '../util/async-event.js'
import { delayMs } from '../util/delay.js'
import { appendDeviceListItem } from '../util/device-list.js'
import { bindTabRoot } from '../util/tabs.js'
import { dumpUSBDevice } from '../util/usb-info.js'

/// <reference types="w3c-web-usb" />

/** @import { I2CBus } from '@johntalton/and-other-delights' */

export class FTDIUIBuilder extends EventTarget {
	/** @type {USBDevice} */
	#device

	/** @type {FTDIDevice|undefined} */
	#driver = undefined

	/** @type {I2CBus|undefined} */
	#vbus = undefined

	#ui

	/** @type {AbortController} */
	#controller = new AbortController()

	/**
	 * @param {USBDevice} device
	 */
	static async builder(device, ui) {
		return new FTDIUIBuilder(device, ui)
	}

	/**
	 * @param {USBDevice} device
	 */
	constructor(device, ui) {
		super()

		this.#device = device
		this.#ui = ui
	}

	#setSubtitle(subtitle) {
		this.dispatchEvent(new CustomEvent('subtitle', {
			detail: subtitle
		}))
	}

	get title() {
		return 'FTDI'
	}



	async open() {
		// console.log('open FTDI')
		// dumpUSBDevice(this.#device)

		const major = this.#device.deviceVersionMajor
		const minor = this.#device.deviceVersionMinor

		const info = Util.chip(major, minor)
		this.#setSubtitle(info?.name)



		await this.#device.open()

		this.#driver = await FTDIDevice.from(this.#device)

		await this.#driver.setBitMode(BIT_MODE.MPSSE)

		const valid = await this.#driver.mpsse.validateMPSSE()
		console.log('MPSSE Valid', valid)

		await FT232HBus.init(this.#driver, {
			targetClockHz: CLOCK_DEFAULT_FAST_MODE_PLUS_1_MHz //CLOCK_DEFAULT_FAST_MODE_400_kHz
		})

		const ftbus = new FT232HBus(this.#driver)
		this.#vbus = I2CTransactionBus.from(ftbus)

		// c0 output
		// this.#driver.mpsse.setGpioHigh(0b0000_0001, 0b0000_0001)


		// 80
		// const buf = Uint16Array.from([
		// 	0x03_12,
		// // 	...('🧟 ❤️ 🧠'.split('').map(c => c.charCodeAt(0)))
		// 	...('Adafruit'.split('').map(c => c.charCodeAt(0)))
		// ])

		// 89
		// const buf = Uint16Array.from([
		// 	0x03_0E,
		// 	...('FT232H'.split('').map(c => c.charCodeAt(0)))
		// ])


		// 96
		// const buf = Uint16Array.from([
		// 	0x03_12,
		// 	...('FT80SUO9'.split('').map(c => c.charCodeAt(0)))
		// ])


		// buf.forEach(async (value, i) => {
		// 	await this.#driver.writeEEPROM(89 + i, value)
		// })


		// await this.#driver.writeEEPROM(12, 0x00_06)
		// await this.#driver.writeEEPROM(14, 0x00_45)

		// await this.#driver.writeEEPROM(5, 0b0000_0000_0000_1000)

		// await this.#driver.writeEEPROM(127, 42847)
	}

	async close(forget = false) {
		this.#controller.abort('close')

		if(this.#device.opened) {
			return this.#device.close()
		}

		if(forget) {
			await this.#device.forget()
		}
	}

	signature() {
		return 'FTDI'
	}

	async buildCustomView() {
		const response = await fetch('./custom-elements/ftdi.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ftdi-config')
		if (root === null) { throw new Error('no root for template') }

		const chipVersionOutput = root.querySelector('output[name="ChipVersion"]')
		if(!(chipVersionOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const chipOutput = root.querySelector('output[name="Chip"]')
		if(!(chipOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }


		const eepromTypeOutput = root.querySelector('output[name="EEPROMType"]')
		if(!(eepromTypeOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const manufactureOutput = root.querySelector('output[name="Manufacture"]')
		if(!(manufactureOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const productOutput = root.querySelector('output[name="Product"]')
		if(!(productOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const serialOutput = root.querySelector('output[name="Serial"]')
		if(!(serialOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const checksumOutput = root.querySelector('output[name="Checksum"]')
		if(!(checksumOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const checksumStatusOutput = root.querySelector('output[name="ChecksumStatus"]')
		if(!(checksumStatusOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }





		const latencyInput = root.querySelector('input[name="LatencyTimer"]')
		if(!(latencyInput instanceof HTMLInputElement)) { throw new Error('missing input') }

		const clearToSendOutput = root.querySelector('output[name="ClearToSend"]')
		if(!(clearToSendOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const dataSetReadyOutput = root.querySelector('output[name="DataSetReady"]')
		if(!(dataSetReadyOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const ringOutput = root.querySelector('output[name="Ring"]')
		if(!(ringOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const carrierDetectOutput = root.querySelector('output[name="CarrierDetect"]')
		if(!(carrierDetectOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }


		const dataReadyOutput = root.querySelector('output[name="DataReady"]')
		if(!(dataReadyOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const overrunErrorOutput = root.querySelector('output[name="OverrunError"]')
		if(!(overrunErrorOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const parityErrorOutput = root.querySelector('output[name="ParityError"]')
		if(!(parityErrorOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const framingErrorOutput = root.querySelector('output[name="FramingError"]')
		if(!(framingErrorOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const interruptOutput = root.querySelector('output[name="Interrupt"]')
		if(!(interruptOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const txHoldingEmptyOutput = root.querySelector('output[name="TXHoldingEmpty"]')
		if(!(txHoldingEmptyOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const txEmptyOutput = root.querySelector('output[name="TXEmpty"]')
		if(!(txEmptyOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }

		const receiverErrorOutput = root.querySelector('output[name="ReceiverError"]')
		if(!(receiverErrorOutput instanceof HTMLOutputElement)) { throw new Error('missing output') }



		const refreshChipVersion = () => {
			const major = this.#device.deviceVersionMajor
			const minor = this.#device.deviceVersionMinor

			const info = Util.chip(major, minor)

			chipVersionOutput.value = `${major}.${minor}`
			chipOutput.value = info?.name ?? 'unknown'

			if(info?.name !== undefined) {
				root.setAttribute('data-name', info?.name)
			}
			else {
				root.removeAttribute('data-name')
			}
		}

		const refreshEEPROM = async () => {
			const major = this.#device.deviceVersionMajor
			const minor = this.#device.deviceVersionMinor
			const chipInfo = Util.chip(major, minor)

			const size16 = chipInfo?.eepromSize

			const buffer16 = await FTDIEEPROM.readEEPROMBulk(this.#driver, size16)
			const info = FTDIEEPROM.parseEEPROM(buffer16, chipInfo)
			console.log('info', info)
			const {
				manufacture,
				product,
				serial,
				checksum, checksumCalculated,
				eepromType,

			} = info ?? {}

			eepromTypeOutput.value = eepromType === undefined ? '<unknown>' : eepromType.name

			manufactureOutput.value = manufacture ?? '<unknown>'
			productOutput.value = product ?? '<unknown>'
			serialOutput.value = serial ?? '<unknown>'

			const checksumValid = checksum === checksumCalculated

			checksumOutput.value = `0x${(checksum ?? 0).toString(16).toUpperCase()}`
			checksumStatusOutput.value = checksumValid ? '✅' : '🛑'
		}

		const refreshLatency = async () => {
			const latency = await this.#driver?.getLatencyTimer()
			if(latency === undefined) { return }
			latencyInput.value = `${latency}`
			latencyInput.disabled = false
		}

		const refreshStatus = async () => {
			clearToSendOutput.value = '-'
			dataSetReadyOutput.value = '-'
			ringOutput.value = '-'
			carrierDetectOutput.value = '-'
			dataReadyOutput.value = '-'
			overrunErrorOutput.value = '-'
			parityErrorOutput.value = '-'
			framingErrorOutput.value = '-'
			interruptOutput.value = '-'
			receiverErrorOutput.value = '-'
			txHoldingEmptyOutput.value = '-'
			txEmptyOutput.value = '-'

			await delayMs(250)

			const status = await this.#driver?.getModemStatus()
			if(status === undefined) { return }
			const { modem, line } = status

			clearToSendOutput.value = modem.isClearToSend ? '✅' : '🛑'
			dataSetReadyOutput.value = modem.isDataSetReady ? '✅' : '🛑'
			ringOutput.value = modem.isRing ? '✅' : '🛑'
			carrierDetectOutput.value = modem.isCarrierDetect ? '✅' : '🛑'

			dataReadyOutput.value = line.isDataReady ? '-' : '✅'
			overrunErrorOutput.value = line.isOverrunError ? '🛑' : '-'
			parityErrorOutput.value = line.isParityError ? '🛑' : '-'
			framingErrorOutput.value = line.isFramingError ? '🛑' : '-'
			interruptOutput.value = line.isInterrupt ? '🛑' : '-'
			receiverErrorOutput.value = line.isReceiverError ? '🛑' : '-'

			txHoldingEmptyOutput.value = line.isTXHoldingEmpty ? '👍' : '👎'
			txEmptyOutput.value = line.isTXEmpty ?  '👍' : '👎'
		}

		const updateLatency = async () => {
			const latency = latencyInput.valueAsNumber
			await this.#driver?.setLatencyTimer(latency)
		}






		const addressElem = root.querySelector('addr-display[name="scanResults"]')
		const deviceList = root.querySelector('[data-device-list]')

		const scanButton = root.querySelector('button[data-scan]')
		if(!(scanButton instanceof HTMLButtonElement)) { throw new Error('invalid scan button') }
		scanButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			scanButton.disabled = true

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())


			//
			const ackedList = await this.#vbus?.scan() ?? []



			ackedList.forEach((addr) => {

				const hexElem = document.createElement('hex-display')

				hexElem.setAttribute('slot', addr)

				hexElem.toggleAttribute('acked', true)
				// hexElem.toggleAttribute('arbitration', arbitration)
				// hexElem.toggleAttribute('timedout', timedout)

				hexElem.textContent = addr.toString(16).padStart(2, '0')

				addressElem.append(hexElem)

				//
				// const listElem = document.createElement('li')
				// listElem.textContent = addr

				// listElem.setAttribute('slot', 'vdevice-guess-list')
				// listElem.toggleAttribute('data-acked', true)

				const guesses = deviceGuessByAddress(addr)
				const item = appendDeviceListItem(deviceList, addr, { acked: true, guesses })

				item.button.addEventListener('click', e => {
					e.preventDefault()

					//
					item.button.disabled = true
					const deviceGuess = item.select.value

					const { signal } = this.#controller

					this.#ui.addI2CDevice({
						type: deviceGuess,
						bus: this.#vbus,
						address: addr,

						port: undefined,
						signal
					})


				}, { once: true })

			})

			scanButton.disabled = false

		}))

		latencyInput.addEventListener('change', event => {
			updateLatency()
		})




		const refreshStatusButton = root.querySelector('button[name="RefreshStatus"]')
		if(!(refreshStatusButton instanceof HTMLButtonElement)) { throw new Error('invalid scan button') }
		refreshStatusButton.addEventListener('click', asyncEvent(async event => {
			refreshStatusButton.disabled = true
			await refreshStatus()
			refreshStatusButton.disabled = false
		}))



		const resetButton = root.querySelector('button[command="--reset"]')
		if(!(resetButton instanceof HTMLButtonElement)) { throw new Error('invalid reset button') }
		resetButton.addEventListener('click', event => {
			const command = resetButton.getAttribute('command')
			if(command !== '--reset') { throw new Error('not a reset') }

			this.#device.reset()
				.then(() => console.log('usb reset'))
				.catch(e => console.log('usb reset error', e))
		})

		const resetDeviceButton = root.querySelector('button[command="--reset-device"]')
		if(!(resetDeviceButton instanceof HTMLButtonElement)) { throw new Error('invalid reset button') }
		resetDeviceButton.addEventListener('click', event => {
			const command = resetDeviceButton.getAttribute('command')
			if(command !== '--reset-device') { throw new Error('not a reset') }

			this.#driver?.reset()
				.then(() => console.log('device reset'))
				.catch(e => console.log('device reset error', e))
		})




		bindTabRoot(root)

		await Promise.all([
			refreshChipVersion(),
			refreshEEPROM(),
			refreshStatus(),
			refreshLatency()
		])

		return root
  }
}



