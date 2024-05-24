import { I2CTransactionBus } from '@johntalton/and-other-delights'
import {
	ExcameraLabsI2CDriver,
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from '@johntalton/excamera-i2cdriver'

import { 	eventStreamFromReader } from '@johntalton/excamera-i2cdriver/capture'

import { deviceGuessByAddress, I2C_GUESSES } from '../devices-i2c/guesses.js'

import { I2CBusExcameraI2CDriver } from '@johntalton/i2c-bus-excamera-i2cdriver'

export const EXCAMERA_LABS_USB_FILTER = { usbVendorId: EXCAMERA_LABS_VENDOR_ID }

async function initScript(port) {
	console.log('running i2cdriver init script')

	// exit and return to i2x mode if not in it already
	await ExcameraLabsI2CDriver.endBitbangCommand(port)
	await ExcameraLabsI2CDriver.exitMonitorMode(port)

	await ExcameraLabsI2CDriver.resetBus(port)
	// await ExcameraLabsI2CDriver.reboot(port)
	await ExcameraLabsI2CDriver.setSpeed(port, 400)

	// end more (64) bytes of @ to flush the connection
	// ?

	// echo some bytes to validate the connection
	console.log('basic echo test for validity')
	const echoSig = [0x55, 0x00, 0xff, 0xaa]
	for (let echoByte of echoSig) {
		// console.log('echoByte', echoByte)
		const result = await ExcameraLabsI2CDriver.echoByte(port, echoByte)
		// console.log({ echoByte, result })
		if(echoByte !== result) { console.warn('EchoByte miss-match')}
	}

	// await ExcameraLabsI2CDriver.setSpeed(port, 100)
}

export class ExcameraI2CDriverUIBuilder {
	#port
	#ui
	#vbus

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
		console.log('opening excamera labs port')

		// this.#port.addEventListener('disconnect', event => {
		// 	console.log('Excamera device disconnect - post open', this)
		// })

		// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
		await this.#port.open({
			baudRate: 1000000,
			dataBits: 8,
			parity: 'none',
			stopBits: 1
		})

		// device author provided init script
		await initScript(this.#port)

		// console.log('check status info')
		// const info = await ExcameraLabsI2CDriver.transmitStatusInfo(this.#port)
		// console.log(info)

		console.warn('allocing untracked vbus ... please cleanup hooks')
		// const vbus = VBusFactory.from({ port: self.#port })
		const I2CAPI = ExcameraLabsI2CDriver.from({ port: this.#port })
		const exbus = I2CBusExcameraI2CDriver.from(I2CAPI)
		this.#vbus = I2CTransactionBus.from(exbus)

	}

	async close() {
		return this.#port.close()
	}

	signature() {
		const info =  this.#port.getInfo()

		return `PORT(USB(${info.usbVendorId},${info.usbProductId}))`
	}

	async buildCustomView(sectionElem) {

		const status = await ExcameraLabsI2CDriver.transmitStatusInfo(this.#port)

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
		} = status


		function uptimeToHuman(uptime) {
			const trunc2 = t => Math.trunc(t * 100) / 100.0

			if(uptime < 60) { return `${uptime} seconds` }
			if(uptime < (60 * 60)) { return `${trunc2(uptime / 60.0)} minutes`}

			return `${trunc2(uptime / 60.0 / 60.0)} hours`
		}

		function appendChildSlot(root, name, elem) {
			elem.setAttribute('slot', name)
			root.appendChild(elem)
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


		function pullupOptions(value) {
			const selected = v => v === value ? 'selected' : ''
			return `
				<option value="0" ${selected(0)}>0 K(no pull-up)</option>
				<option value="1" ${selected(1)}>2.2 K</option>
				<option value="2" ${selected(2)}>4.3 K</option>
				<option value="3" ${selected(3)}>1.5 K</option>
				<option value="4" ${selected(4)}>4.7 K</option>
				<option value="5" ${selected(5)}>1.5 K</option>
				<option value="6" ${selected(6)}>2.2 K</option>
				<option value="7" ${selected(7)}>1.1 K</option>
				`
			}

		const page = `
			<excamera-i2cdriver>

				<div class="tabs" slot="prefix">
					<button data-tab="settings" data-active>Settings</button>
					<button data-tab="scan">Scan</button>
					<button disabled data-tab="capture">Capture</button>
					<button disabled data-tab="bitbang">Bitbang</button>
				</div>

				<div data-for-tab="scan" class="tabsContent">
					<button id="Scan">Scan 🔎</button>

					<addr-display>
					</addr-display>

					<ul data-device-list>
					</ul>

					<form data-manual-add-form>
						<label>Address</label>
						<input name="ManualAddress" type="number" min="8" max="119" step="1" value="${32}" />

						<label>Device</label>
						<select name="ManualDeviceSelection">
							${I2C_GUESSES.map(({ name }) => {
								return `<option value="${name}" ${name === 'mcp230xx (Gpio)' ? 'selected' : ''}>${name}</option>`
							}).join('')}
						</select>

						<button submit>Create 🕹</button>
					</form>
				</div>

				<div data-for-tab="capture" class="tabsContent">
					<button>Start ▶️</button>
				</div>

				<div data-for-tab="settings" class="tabsContent" data-active>
					<form data-config>
						<label for="">Mode</label>
						<select name="mode">
							<option value="0">I²C Host</option>
							<option value="1">Bitbang</option>
							<option value="2">Monitor</option>
							<option value="3">Capture</option>
						</select>

						<label>Speed</label>
						<select name="speed">
							<option value="100" ${speed === 100 ? 'selected' : ''}>100kHz</option>
							<option value="400" ${speed === 400 ? 'selected' : ''}>400kHz</option>
						</select>

						<label>Pullups SDA</label>
						<select name="pullupSDA">
							${pullupOptions(pullups.sdaValue)}
						</select>

						<label for="pullupSCL">Pullups SCL</label>
						<select name="pullupSCL">
							${pullupOptions(pullups.sclValue)}
						</select>
					</form>

					<form data-info method="dialog">
						<label>Model</label>
						<output name="model">${identifier}</output>

						<label>Serial</label>
						<output name="serial">${serial}</output>

						<label>Uptime (S)</label>
						<output name="uptime">${uptime} (${uptimeToHuman(uptime)})</output>

						<label>Voltage (V)</label>
						<output name="voltage">${voltage}</output>

						<label>Current (mA)</label>
						<output name="current">${current}</output>

						<label>Temperature (°C)</label>
						<output name="temperature">${temperature}</output>

						<label>SDA</label>
						<output name="sda"></output>

						<label>SCL</label>
						<output name="scl"></output>

						<button id="updateConfigInfo" type="button">Update</button>
					</form>


				</div>
				<div data-for-tab="bitbang" class="tabsContent">
					<form data-bitbang>
						:)
						<button id="sendBitbang">Go</button>
					</form>
			</excamera-i2cdriver>
		`

		const stuff = (new DOMParser()).parseFromString(page, 'text/html')


		const configForm = stuff.querySelector('[data-config]')
		// configForm.addEventListener('submit', event => {
		// 	console.log('submt form', event)
		// })

		configForm.addEventListener('change', event => {
			Promise.resolve()
				.then(async () => {
					// const data = new FormData(event.target.form)

					// for (const [key, value] of data) {
					// 	console.log(key, value)
					// }

					const form = event.target.form
					const modeElem = form.querySelector('select[name="mode"]')
					const mode = parseInt(modeElem.value, 10)

					console.log(mode, modeElem)

					if(mode === 0) {
						// return to i2c
						console.log('exit bitbang/monitor')
						await ExcameraLabsI2CDriver.exitBitbangMode(this.#port)
						await ExcameraLabsI2CDriver.exitMonitorMode(this.#port)
						await ExcameraLabsI2CDriver.resetBus(this.#port)
						await ExcameraLabsI2CDriver.setSpeed(this.#port, 400)
					}
					else if(mode === 1)
					{
						// bitbang
						console.log('enter bitbang')
						await ExcameraLabsI2CDriver.enterBitbangMode(this.#port)
					}
					else if(mode === 2)
					{
						// monitor
						console.log('enter monitor')
						await ExcameraLabsI2CDriver.enterMonitorMode(this.#port)
					}
					else if(mode === 3)
					{
						// capture
						console.log('enter cpature')
					}


				})
				.catch(e => console.warn(e))
		})

		const setnBBButton = stuff.getElementById('sendBitbang')
		setnBBButton.addEventListener('click', event => {
			event.preventDefault()
			event.stopPropagation()

			Promise.resolve()
				.then(async () => {

					await ExcameraLabsI2CDriver.enterBitbangMode(this.#port)

					const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

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
		})

		const updateButton = stuff.getElementById('updateConfigInfo')
		updateButton.addEventListener('click', event => {
			event.preventDefault()

			updateButton.disabled = true
			Promise.resolve()
				.then(async () => {

					const status = await ExcameraLabsI2CDriver.transmitStatusInfo(this.#port)

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
					} = status

					const humanUptime = uptimeToHuman(uptime)

					const exRoot = event.target.closest('excamera-i2cdriver')
					const out = name => exRoot.querySelector(`[data-info] output[name=${name}]`)

					out('model').innerText = identifier
					out('serial').innerText = serial
					out('uptime').innerText = `${uptime} (${humanUptime})`
					out('voltage').innerText = voltage
					out('current').innerText = current
					out('temperature').innerText = temperature
					out('sda').innerText = `${sda} (${sda === 1 ? 'Idle' : 'Active'})`
					out('scl').innerText = `${scl} (${scl === 1 ? 'Idle' : 'Active'})`

					updateButton.disabled = false
				})
				.catch(e => {
					updateButton.disabled = false
					console.warn(e)
				})
		})


		function selectTab(name, buttonElem) {
			const driverDoc = buttonElem.closest('excamera-i2cdriver')

			const tabButton = driverDoc.querySelector(`button[data-tab="${name}"]`)
			tabButton.disabled = true

			// remove content active
			const activeOthers = driverDoc.querySelectorAll('.tabsContent[data-active]')
			activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

			// remove tab button active
			const activeOthersTabsButtons = driverDoc.querySelectorAll('button[data-tab]')
			activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

			// set content active
			const tabContentElem = driverDoc.querySelector(`[data-for-tab="${name}"]`)
			tabContentElem.toggleAttribute('data-active', true)

			// set tab button active
			tabButton.toggleAttribute('data-active', true)

			tabButton.disabled = false
		}

		const tabBitbang = stuff.querySelector('button[data-tab="bitbang"]')
		tabBitbang.disabled = false
		tabBitbang.addEventListener('click', event => {
			selectTab('bitbang', event.target)
		})

		const tabSettings = stuff.querySelector('button[data-tab="settings"]')
		tabSettings.addEventListener('click', event => {
			selectTab('settings', event.target)
		})


		const foo = stuff.querySelector('button[data-tab="scan"]')
		foo.addEventListener('click', event => {
			selectTab('scan', event.target)
		})



		const addrDisp = stuff.querySelector('addr-display')
		const devList = stuff.querySelector('[data-device-list]')
		const manualAddForm = stuff.querySelector('[data-manual-add-form]')
		const manualCreateDevice = manualAddForm?.querySelector('button[submit]')
		const manualDeviceSelection = manualAddForm?.querySelector('select[name="ManualDeviceSelection"]')
		const manualAddressInput = manualAddForm?.querySelector('input[name="ManualAddress"]')

		const startScanButton = stuff.getElementById('Scan')
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
				address: addr
			})
		})

		return stuff.body.firstChild


		const root = document.createElement('excamera-i2cdriver')

		const ulElem = document.createElement('ul')
		// ulElem.setAttribute('slot', 'vdevice-guess-list')

		const addressElem = document.createElement('addr-display')
		// addressElem.setAttribute('slot', 'scan-display')

		const scanButton = document.createElement('button')
		// scanButton.setAttribute('slot', 'scan-display')
		scanButton.textContent = 'Scan'

		// const resetButton = root.shadowRoot.getElementById('reset')
		// resetButton.addEventListener('click', e => {
		// 	Promise.resolve()
		// 		.then(async () => {
		// 			await ExcameraLabsI2CDriver.endBitbangCommand(this.#port)
		// 		})
		// 		.catch(e => {
		// 			console.warn(e)
		// 		})
		// })

		// const rebootElem = document.createElement('button')
		// rebootElem.textContent = 'Reboot'

		// const resetElem = document.createElement('button')
		// resetElem.textContent = 'Reset Bus'

		const captureStartElem = document.createElement('button')
		const captureEndElem = document.createElement('button')

		captureStartElem.textContent = 'Start Capture ▶️'
		captureEndElem.textContent = 'Stop Capture ⏸'

		appendChildSlot(root, 'capture-controls', captureStartElem)
		appendChildSlot(root, 'capture-controls', captureEndElem)


		captureStartElem.addEventListener('click', e => {
			console.log('start capture')
			captureStartElem.disabled = true
			scanButton.disabled = true

			Promise.resolve()
				.then(async () => {
					const controller = new AbortController()
					const { signal } = controller

					console.log('entering cpature mode')
					// await ExcameraLabsI2CDriver.enterMonitorMode(this.#port)
					await ExcameraLabsI2CDriver.enterCaptureMode(this.#port)

					const defaultReader = this.#port.readable.getReader()
					const pipeline = eventStreamFromReader(defaultReader, { signal })

					captureEndElem.disabled = false

					captureEndElem.addEventListener('click', e => {
						controller.abort('user requested stop')
						defaultReader.cancel('user request stop')
						defaultReader.releaseLock()
					}, { once: true })



					console.log('strting reader loop')
					let prevState = undefined
					const idleLike = state => (state === 'IDLE' || state === 'WARM')
					for await (const event of pipeline) {
						if(idleLike(prevState) && idleLike(event.state)) { continue }

						console.log(event)

						prevState = event.state
					}

					const last = await pipeline.next()
					console.log('this is the aftermath of the stream', last)
				})
				.catch(console.warn)
		}, { once: true })

		scanButton.addEventListener('click', e => {
			scanButton.disabled = true

			ExcameraLabsI2CDriver.scan(this.#port)
				.then(results => {
					const olds = addressElem.querySelectorAll('hex-display')
					olds?.forEach(old => old.remove())

					results.map(result => {
						const {
							dev: addr,
							ack: acked,
							to: timeout,
							arb: arbitration
						} = result

						const hexElem = document.createElement('hex-display')

						hexElem.setAttribute('slot', addr)

						hexElem.toggleAttribute('acked', acked)
						hexElem.toggleAttribute('arbitration', arbitration)
						hexElem.toggleAttribute('timeout', timeout)

						hexElem.textContent = addr.toString(16).padStart(2, '0')

						const listElem = document.createElement('li')
						listElem.textContent = addr

						listElem.toggleAttribute('data-acked', acked)
						listElem.toggleAttribute('data-arbitration', arbitration)
						listElem.toggleAttribute('data-timeout', timeout)

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
							makeDeviceButton.disabled = true
							guessSelectElem.disabled = true

							const deviceGuess = guessSelectElem.value

							console.warn('allocing untracked vbus ... please cleanup hooks')
							const vbus = VBusFactory.from({ port: this.#port })

							this.#ui.addI2CDevice({
								type: deviceGuess,
								bus: vbus,
								address: addr
							})



						}, { once: true })

						listElem.appendChild(guessSelectElem)

						return { hexElem, listElem }
					})
					.forEach(({ hexElem, listElem }) => {
						addressElem.appendChild(hexElem)
						ulElem.appendChild(listElem)
					})

					scanButton.disabled = false
				})
				.catch(console.warn)
				.then(() => {
					scanButton.disabled = false
				})
		}, { once: false })

		root.appendChild(addressElem)
		root.appendChild(ulElem)
		root.appendChild(scanButton)
		return root
	}
}

