
import {
	ExcameraLabsI2CDriver,
	EXCAMERA_LABS_VENDOR_ID,
	EXCAMERA_LABS_MINI_PRODUCT_ID
} from '@johntalton/excamera-i2cdriver'

import { 	eventStreamFromReader } from '@johntalton/excamera-i2cdriver/capture'

import { deviceGuessByAddress } from '../devices-i2c/guesses.js'

import { I2CBusExcameraI2CDriver } from '@johntalton/i2c-bus-excamera-i2cdriver'

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

class VBusFactory {
	static from({ port }) {
		// console.log('make driver over port', port)
		const I2CAPI = ExcameraLabsI2CDriver.from({ port })
		const vbus = I2CBusExcameraI2CDriver.from(I2CAPI)
		return vbus
	}
}

export class ExcameraI2CDriverUIBuilder {
	#port
	#ui

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

		console.log('check status info')
		const info = await ExcameraLabsI2CDriver.transmitStatusInfo(this.#port)
		console.log(info)
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
								to: timedout,
								arb: arbitration
							} = result



							const text = addr.toString(16).padStart(2, '0')

							const template = `
								<hex-display slot="${addr}"
									${acked ? 'acked' : '' }
									${arbitration ? 'arbitration' : '' }
									${timedout ? 'timedout' : '' }
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

								console.warn('allocing untracked vbus ... please cleanup hooks')
								const vbus = VBusFactory.from({ port: self.#port })

								self.#ui.addI2CDevice({
									port: self.#port,
									type: deviceGuess,
									bus: vbus,
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
				</div>

				<div data-for-tab="capture" class="tabsContent">
					<button>Start ▶️</button>
				</div>

				<div data-for-tab="settings" class="tabsContent" data-active>
					<form data-config>
						<label for="">Mode</label>
						<select id="">
							<option name="" value="">I²C Host</option>
							<option name="" value="">Bitbang</option>
							<option name="" value="">Monitor</option>
							<option name="" value="">Capture</option>
						</select>


						<label>Speed</label>
						<select name="speed">
							<option value="100" ${speed === 100 ? 'selected' : ''}>100kHz</option>
							<option value="400" ${speed === 400 ? 'selected' : ''}>400kHz</option>
						</select>

						<label>Pullups SDA</label>
						<select id="" name="">
							${pullupOptions(pullups.sdaValue)}
						</select>

						<label for="pullupSCL">Pullups SCL</label>
						<select id="" name="pullupSCL">
							${pullupOptions(pullups.sclValue)}
						</select>
					</form>

					<form data-info>
						<label>Model</label>
						<output name="model">${identifier}</output>

						<label>Serial</label>
						<output name="serial">${serial}</output>

						<label>Uptime (S)</label>
						<output name="uptime">${uptime}</output>

						<label>Voltage (mA)</label>
						<output name="voltage">${voltage}</output>

						<label>Current (V)</label>
						<output name="current">${current}</output>

						<label>Temperature (°C)</label>
						<output name="temperature">${temperature}</output>

						<label>SDA</label>
						<output name="sda">${sda === 1 ? 'Idle' : 'Active' }</output>

						<label>SCL</label>
						<output name="scl">${scl === 1 ? 'Idle' : 'Active' }</output>

						<button>Update</button>
					</form>
				</div>
			</excamera-i2cdriver>
		`

		const stuff = (new DOMParser()).parseFromString(page, 'text/html')

		const foo = stuff.querySelector('button[data-tab="scan"]')
		foo.addEventListener('click', event => {
			const tabScanButton = document.querySelector('button[data-tab="scan"]')
			tabScanButton.disabled = true

			// remove content active
			const activeOthers = document.querySelectorAll('excamera-i2cdriver .tabsContent[data-active]')
			activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

			// remove tab button active
			const activeOthersTabsButtons = document.querySelectorAll('excamera-i2cdriver button[data-tab]')
			activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

			// set content active
			const tabContentElem = document.querySelector('[data-for-tab="scan"]')
			tabContentElem.toggleAttribute('data-active', true)

			// set tab button active
			tabScanButton.toggleAttribute('data-active', true)

			tabScanButton.disabled = false
		})



		const addrDisp = stuff.querySelector('addr-display')
		const devList = stuff.querySelector('[data-device-list]')

		const startScanButton = stuff.getElementById('Scan')
		startScanButton.addEventListener('click', event => handelScan(event, addrDisp, devList))

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
							to: timedout,
							arb: arbitration
						} = result

						const hexElem = document.createElement('hex-display')

						hexElem.setAttribute('slot', addr)

						hexElem.toggleAttribute('acked', acked)
						hexElem.toggleAttribute('arbitration', arbitration)
						hexElem.toggleAttribute('timedout', timedout)

						hexElem.textContent = addr.toString(16).padStart(2, '0')

						const listElem = document.createElement('li')
						listElem.textContent = addr

						listElem.toggleAttribute('data-acked', acked)
						listElem.toggleAttribute('data-arbitration', arbitration)
						listElem.toggleAttribute('data-timedout', timedout)

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

