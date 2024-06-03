import { I2CTransactionBus } from '@johntalton/and-other-delights'
import {
	ExcameraLabsI2CDriver,
	EXCAMERA_LABS_VENDOR_ID,
	ExcameraLabsI2CDriverI2C
} from '@johntalton/excamera-i2cdriver'
import { I2CBusExcameraI2CDriver } from '@johntalton/i2c-bus-excamera-i2cdriver'
import { 	eventStreamFromReader } from '@johntalton/excamera-i2cdriver/capture'

import { deviceGuessByAddress, I2C_GUESSES } from '../devices-i2c/guesses.js'
import { delayMs} from '../util/delay.js'
import { asyncEvent } from '../util/async-event.js'

export const EXCAMERA_LABS_USB_FILTER = { usbVendorId: EXCAMERA_LABS_VENDOR_ID }

async function initScript(port) {
	console.log('running i2cdriver init script')

	// exit and return to i2x mode if not in it already
	await ExcameraLabsI2CDriver.endBitbangCommand(port)
	await ExcameraLabsI2CDriver.exitMonitorMode(port)

	// await ExcameraLabsI2CDriver.resetBus(port)
	// await ExcameraLabsI2CDriver.reboot(port)
	// await ExcameraLabsI2CDriver.setSpeed(port, 400)

	// end more (64) bytes of @ to flush the connection
	// ?

	await delayMs(500)

	// echo some bytes to validate the connection
	console.log('basic echo test for validity')
	const echoSig = [0x55, 0x00, 0xff, 0xaa]
	for (let echoByte of echoSig) {
		// console.log('echoByte', echoByte)
		const result = await ExcameraLabsI2CDriver.echoByte(port, echoByte)
		console.log({ echoByte, result })
		if(echoByte !== result) { console.warn('EchoByte miss-match')}
	}

	// await ExcameraLabsI2CDriver.setSpeed(port, 100)
}

async function startCapture(port) {
	const controller = new AbortController()
	const { signal } = controller

	await ExcameraLabsI2CDriver.enterCaptureMode(port)
	const reader = port.readable.getReader()

	// const buffer = Uint8Array.from([
		// 0x1c, 0xac, 0xbe, 0xc1, 0xca, 0xe8, 0x88, 0xd8, 0xd2

	// 	0x00, 0x00, 0x00,
	// 	0b0001_1000, 0b1110_1000,
	// 	0b1001_1010, 0b1100_0010,

	// 	// 0x00,
	// 	0b0001_1000, 0b1110_1010,
	// 	0b1010_1011, 0b1010_1000,
	// 	0b1010_1001, 0b0010_0000,

	// 	0x00, 0x00, 0x00,
	// 	0b0001_1000, 0b1110_1000,
	// 	0b1001_1010, 0b1100_0010,

	// 	// 0x00,
	// 	0b0001_1000, 0b1110_1010,
	// 	0b1010_1011, 0b1010_1000,
	// 	0b1010_1001, 0b0010_0000
	// ])
	// const blob = new Blob([ buffer ])
	// const stream = blob.stream()
	// const reader = stream.getReader()


	const pipeline = eventStreamFromReader(reader, { signal })

	return {
		pipeline,
		abort: async () => {
			controller.abort('user requested stop')
			reader.cancel('user request stop')
			reader.releaseLock()
		}
	}
}




export class ExcameraI2CDriverUIBuilder {
	#port
	#ui
	#vbus
	#capture

	static async builder(port, ui) {
		return new ExcameraI2CDriverUIBuilder(port, ui)
	}

	constructor(port, ui) {
		this.#port = port
		this.#ui = ui
	}

	get title() {
		return 'Excamera Labs I²CDriver'
	}

	async open() {
		// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
		await this.#port.open({
			baudRate: 1000000,
			dataBits: 8,
			parity: 'none',
			stopBits: 1
		})

		// device author provided init script
		await initScript(this.#port)

		console.warn('allocing untracked vbus ... please cleanup hooks')
		const I2C = ExcameraLabsI2CDriverI2C.from({ port: this.#port })
		const exbus = I2CBusExcameraI2CDriver.from(I2C)
		this.#vbus = I2CTransactionBus.from(exbus)
	}

	async close() { return this.#port.close() }

	signature() {
		const info =  this.#port.getInfo()
		return `PORT(USB(${info.usbVendorId},${info.usbProductId}))`
	}

	async buildCustomView(sectionElem) {
		const response = await fetch('./custom-elements/excamera-i2cdriver.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('excamera-i2cdriver')
		if (root === null) { throw new Error('no root for template') }


		const modeSelect = root.querySelector('[data-config] select[name="mode"]')
		const speedSelect = root.querySelector('[data-config] select[name="speed"]')
		const pullUpSelectSDA = root.querySelector('[data-config] select[name="pullupSDA"]')
		const pullUpSelectSCL = root.querySelector('[data-config] select[name="pullupSCL"]')

		const manualAddForm = root.querySelector('[data-manual-add-form]')
		const manualCreateDevice = manualAddForm?.querySelector('button[submit]')
		const manualDeviceSelection = manualAddForm?.querySelector('select[name="ManualDeviceSelection"]')
		const manualAddressInput = manualAddForm?.querySelector('input[name="ManualAddress"]')

		const dataCaptureList = root.querySelector('[data-capture-list]')

		const PREFERRED_DEVICE = 'adt7410'
		const manualOptionsTemplate = manualDeviceSelection?.querySelector('template')
		manualDeviceSelection?.append(...I2C_GUESSES.map(({ addresses, name }) => {
			const templateDoc = manualOptionsTemplate?.content.cloneNode(true)
			const optionElem = templateDoc?.querySelector('option')
			optionElem.setAttribute('value', name)
			optionElem.innerText = name

			if(name.includes(PREFERRED_DEVICE)) {
				optionElem.selected = true
				manualAddressInput.value = addresses[0]
			}

			return optionElem
		}))



		const toggleCaptureButton = root.querySelector('button[data-capture]')
		toggleCaptureButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			toggleCaptureButton.disabled = true

			const state = toggleCaptureButton.getAttribute('data-capture')

			if(state === 'Start') {
				if(this.#capture !== undefined) { this.#capture.abort() }
				this.#capture = await startCapture(this.#port)

				toggleCaptureButton.setAttribute('data-capture', 'Stop')
				toggleCaptureButton.disabled = false

				dataCaptureList?.querySelectorAll('li').forEach(li => li.remove())

				let prevState = ''
				const idleLike = state => (state === 'IDLE' || state === 'WARM')
				const pipeline = this.#capture.pipeline

				try {
					for await (const event of pipeline) {
						// console.log(event)

						const {
							state, address, mode, buffer
						} = event


						if(prevState === 'IDLE' && state === 'IDLE') {
							continue
						}

						if(prevState === 'WARM' && state === 'WARM') {
							continue
						}

						prevState = state

						if(state === 'ADDRESSED_ACKED') {
							const lastLi = dataCaptureList?.querySelector('li:last-child')
							lastLi?.toggleAttribute('data-acked', true)
							continue
						}

						const liElem = document.createElement('li')
						liElem.dataset.state = state
						liElem.dataset.address = address
						liElem.dataset.mode = mode

						const toHex = value => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`

						if(state === 'ADDRESSED') {
							liElem.innerText = toHex(address)
						}

						if(state === 'TRANS_ACKED' || state === 'TRANS_NACK') {
							liElem.toggleAttribute('data-acked', state === 'TRANS_ACKED')

							const u8 = ArrayBuffer.isView(buffer) ?
								new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
								new Uint8Array(buffer)

							liElem.innerText = [ ...u8 ].map(toHex).join(' ')
						}




						dataCaptureList?.append(liElem)

					}
				}
				catch (e) {
					// catch error in pipline for loop
					console.warn(e)
				}


				console.log('After Capture', await pipeline.next())
				toggleCaptureButton.setAttribute('data-capture', 'Start')
				await initScript(this.#port)
				toggleCaptureButton.disabled = false
			}
			else if (state === 'Stop'){
				console.log('Stop')
				if(this.#capture === undefined) { return }
				await this.#capture.abort()
				this.#capture = undefined
			}
		}))

		const clearCaptureButton = root.querySelector('button[data-clear]')
		clearCaptureButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			dataCaptureList?.querySelectorAll('li').forEach(li => li.remove())
		}))

		function uptimeToHuman(uptime) {
			const trunc2 = t => Math.trunc(t * 100) / 100.0
			if(uptime < 60) { return `${uptime} seconds` }
			if(uptime < (60 * 60)) { return `${trunc2(uptime / 60.0)} minutes`}
			return `${trunc2(uptime / 60.0 / 60.0)} hours`
		}

		const refresh = async () => {
			// const internalState = await ExcameraLabsI2CDriver.internalState(this.#port)

			const {
				identifier,
				serial,
				uptime,
				voltage,
				current,
				temperature,
				mode,
				sda,
				scl,
				speed,
				pullups,
				crc
			} = await ExcameraLabsI2CDriver.transmitStatusInfo(this.#port)

			// console.log({
			// 	mode, speed, pullups
			// })

			const out = name => root.querySelector(`[data-info] output[name=${name}]`)

			modeSelect.value = mode
			speedSelect.value = speed
			pullUpSelectSCL.value = pullups.sclValue
			pullUpSelectSDA.value = pullups.sdaValue

			out('model').innerText = identifier
			out('serial').innerText = serial
			out('uptime').innerText = `${uptime} (${uptimeToHuman(uptime)})`
			out('voltage').innerText = voltage
			out('current').innerText = current
			out('temperature').innerText = temperature
			out('sda').innerText = `${sda} (${sda === 1 ? 'Idle' : 'Active'})`
			out('scl').innerText = `${scl} (${scl === 1 ? 'Idle' : 'Active'})`
			out('crc').value = `0x${crc.toString(16).padStart(8, '0')}`
		}


		const self = this
		function handelScan(event, addrDisp, devList) {
			console.log('handelScan')
			const button = event.target

			button.disabled = true

			const existingHexs = addrDisp.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = devList.querySelectorAll('li')
			existingLis.forEach(el => el.remove())

			ExcameraLabsI2CDriver.scan(self.#port)
				.then(results => {
					results
						.forEach(result => {
							const {
								dev: addr,
								ack: acked,
								to: timeout,
								arb: arbitration
							} = result



							const text = addr.toString(16).padStart(2, '0')

							const template = `
								<hex-display slot="${addr}"
									${acked ? 'acked' : '' }
									${arbitration ? 'arbitration' : '' }
									${timeout ? 'timeout' : '' }
									>
									${text}
								</hex-display>
							`

							const node = (new DOMParser()).parseFromString(template, 'text/html')
							const elem = node.body.firstChild

							addrDisp.appendChild(elem)


							//
							const guesses = deviceGuessByAddress(addr)

							const template2 = `
								<li ${acked ? 'data-acked' : '' }>
								${addr}
									<select>
										${guesses.map(guess => {
											return `<option value="${guess.name}">${guess.name}</option>`
										}).join('')}
									</select>

									<button>Create 🕹</button>
								</li>
								`

							const node2 = (new DOMParser()).parseFromString(template2, 'text/html')
							const elem2 = node2.body.firstChild
							devList.appendChild(elem2)


							const makeDeviceButton = elem2.querySelector('button')
							const guessSelectElem = elem2.querySelector('select')

							makeDeviceButton.addEventListener('click', event => {
								makeDeviceButton.disabled = true
								guessSelectElem.disabled = true

								const deviceGuess = guessSelectElem.value

								// todo change over to newer post message style
								self.#ui.addI2CDevice({
									port: self.#port,
									type: deviceGuess,
									bus: self.#vbus,
									address: addr
								})
							}, { once: true })
						})


				})
				.catch(console.warn)
				.then(() => {
					button.disabled = false
				})
		}

		const configForm = root.querySelector('[data-config]')
		configForm?.addEventListener('change', asyncEvent(async event => {
			const whatChanged = event.target.getAttribute('name')

			if(whatChanged === 'speed') {
				await ExcameraLabsI2CDriver.setSpeed(this.#port, parseInt(speedSelect.value))
				await refresh()
			}
			else if(whatChanged === 'pullupSCL' || whatChanged === 'pullupSDA') {
				await ExcameraLabsI2CDriver.setPullupControls(this.#port, parseInt(pullUpSelectSDA.value), parseInt(pullUpSelectSCL.value))
				await refresh()
			}
		}))

		const setnBBButton = doc.getElementById('sendBitbang')
		setnBBButton?.addEventListener('click', asyncEvent(event => {
			event.preventDefault()
			event.stopPropagation()

			Promise.resolve()
				.then(async () => {

					await ExcameraLabsI2CDriver.enterBitbangMode(this.#port)

					function encodeBB(options) {
						function encodePin(pin) {
							if(pin === 0) { return 0b01 } // output assert 0
							if(pin === 1) { return 0b11 } // output assert 1
							if(pin === undefined) { return 0b10 } // input float

							throw new Error('ping state invalid')
						}

						const { sda, scl, report } = options
						return (report === true ? 0b000_1_00_00 : 0)
							| encodePin(sda) | (encodePin(scl) << 2)
					}

					function parseBB(value) {
						const sda = value & 0b1
						const scl = (value >> 1) & 0b1

						return { sda, scl }
					}

					function assertBB(value, expected) {
						if ((value.sda === expected.sda) && (value.scl === expected.scl)) {
							return true
						}

						console.log('assertBB false', value, expected)
						return false
					}

					// console.log('check bus free')
					// const a = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [ encodeBB({ report: true }) ])
					// assertBB(parseBB(a), { sda: 1, scl: 1 })


					// console.log('assert data start')
					// const b = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [ encodeBB({ sda: 0, report: true }) ])
					// assertBB(parseBB(b), { sda: 0, scl: 1 })

					// await delayMs(500)

					// console.log('assert clock start')
					// const c = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [ encodeBB({ sda: 0, scl: 0, report: true }) ])
					// assertBB(parseBB(c), { sda: 0, scl: 0 })

					// await delayMs(500)

					// console.log('send data')
					const data = 0x48
					const rw = 0
					// const f = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [
					// 	encodeBB({ sda: ((data >> 6) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 5) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 4) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 3) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 2) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 1) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
					// 	encodeBB({ sda: ((data >> 0) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),

					// 	encodeBB({ sda: rw, scl: 1 }), encodeBB({ sda: 0, scl: 0 }),

					// 	encodeBB({ sda: 1, scl: 1, report: true })
					// ])
					// assertBB(parseBB(f), { sda: 1, scl: 1 })

					// console.log('send data done')
					// const g = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [ encodeBB({ sda: 0, scl: 0, report: true }) ])
					// assertBB(parseBB(g), { sda: 0, scl: 0 })

					// await delayMs(500)

					// console.log('assert data stop')
					// const h = await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [ encodeBB({ sda: 0, scl: 1 }), encodeBB({ sda: 1, scl: 1, report: true }) ])
					// assertBB(parseBB(h), { sda: 1, scl: 1 })




					await ExcameraLabsI2CDriver.sendBitbangCommand(this.#port, [
						encodeBB({ sda: 0 }),
						encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 6) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 5) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 4) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 3) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 2) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 1) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: ((data >> 0) & 0b1), scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: rw, scl: 1 }), encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: 1, scl: 1 }),
						encodeBB({ sda: 0, scl: 0 }),
						encodeBB({ sda: 0, scl: 1 }), encodeBB({ sda: 1, scl: 1 })
					])


					await ExcameraLabsI2CDriver.exitBitbangMode(this.#port)

					// await initScript(this.#port)

					console.log('inited')

				})
				.catch(e => console.warn(e))
		}))

		const updateButton = root.querySelector('button[data-update]')
		updateButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			updateButton.disabled = true

			await refresh()

			updateButton.disabled = false
		}))

		const resetButton = root.querySelector('button[data-reset]')
		resetButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await ExcameraLabsI2CDriver.resetBus(this.#port)
			await refresh()
		}))

		const rebootButton = root.querySelector('button[data-reboot]')
		rebootButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await ExcameraLabsI2CDriver.reboot(this.#port)
		}))

		const addrDisp = root.querySelector('addr-display')
		const devList = root.querySelector('[data-device-list]')
		const startScanButton = root.querySelector('button[data-scan]')
		startScanButton?.addEventListener('click', event => handelScan(event, addrDisp, devList))

		manualCreateDevice?.addEventListener('click', event => {
			event.preventDefault()

			const addr = manualAddressInput?.value
			const deviceGuess = manualDeviceSelection?.value

			// todo change over to newer post message style
			self.#ui.addI2CDevice({
				port: self.#port,
				type: deviceGuess,
				bus: self.#vbus,
				address: parseInt(addr)
			})
		})


		const tabButtons = root.querySelectorAll('button[data-tab]')
		for (const tabButton of tabButtons) {
			tabButton.addEventListener('click', event => {
				event.preventDefault()

				const { target } = event
				const parent = target?.parentNode
				const grandParent = parent.parentNode

				const tabName = target.getAttribute('data-tab')

				// remove content active
				const activeOthers = grandParent.querySelectorAll(':scope > [data-active]')
				activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

				// remove tab button active
				const activeOthersTabsButtons = parent.querySelectorAll(':scope > button[data-tab]')
				activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

				const tabContentElem = grandParent.querySelector(`:scope > [data-for-tab="${tabName}"]`)
				if(tabContentElem === null) { console.warn('tab content not found', tabName) }
				else {
					tabContentElem.toggleAttribute('data-active', true)
				}

				tabButton.toggleAttribute('data-active', true)
			})
		}


		await refresh()

		return root



		// function selectTab(name, buttonElem) {
		// 	const driverDoc = buttonElem.closest('excamera-i2cdriver')

		// 	const tabButton = driverDoc.querySelector(`button[data-tab="${name}"]`)
		// 	tabButton.disabled = true

		// 	// remove content active
		// 	const activeOthers = driverDoc.querySelectorAll('.tabsContent[data-active]')
		// 	activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

		// 	// remove tab button active
		// 	const activeOthersTabsButtons = driverDoc.querySelectorAll('button[data-tab]')
		// 	activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

		// 	// set content active
		// 	const tabContentElem = driverDoc.querySelector(`[data-for-tab="${name}"]`)
		// 	tabContentElem.toggleAttribute('data-active', true)

		// 	// set tab button active
		// 	tabButton.toggleAttribute('data-active', true)

		// 	tabButton.disabled = false
		// }

		// const tabBitbang = stuff.querySelector('button[data-tab="bitbang"]')
		// tabBitbang.disabled = false
		// tabBitbang.addEventListener('click', event => {
		// 	selectTab('bitbang', event.target)
		// })

		// const tabSettings = stuff.querySelector('button[data-tab="settings"]')
		// tabSettings.addEventListener('click', event => {
		// 	selectTab('settings', event.target)
		// })


		// const foo = stuff.querySelector('button[data-tab="scan"]')
		// foo.addEventListener('click', event => {
		// 	selectTab('scan', event.target)
		// })


	}
}
