import { deviceGuessByAddress } from '../devices-i2c/guesses.js'

export const MASH_USB_FILTER = { usbVendorId: 9114 }


export class MashBus {
	#port

	static from(port) { return new MashBus(port) }

	constructor(port) { this.#port = port }

	async sendByte(address, byteValue) {}

	async readI2cBlock(address, cmd, length, bufferSource) {
		const result = await transfer(this.#port, Uint8Array.from([ 'R'.charCodeAt(0), address, cmd, length ]), length)
		const result8 = new Uint8Array(result)

		return {
			bytesRead: result.byteLength,
			buffer: result
		}
	}

	async writeI2cBlock(address, cmd, length, bufferSource) {
		const bs8 = ArrayBuffer.isView(bufferSource) ?
			new Uint8Array(bufferSource.buffer, bufferSource.byteOffset, bufferSource.byteLength) :
			new Uint8Array(bufferSource)

		const _zeroLengthBuffer = await transfer(this.#port, Uint8Array.from([ 'W'.charCodeAt(0), address, cmd, length, ...bs8 ]), 0)

		return {
			bytesWritten: length
		}
	}

	async i2cRead(address, length, bufferSource) {
		const result = await transfer(this.#port, Uint8Array.from([ 'r'.charCodeAt(0), address, length ]), length)
		const result8 = new Uint8Array(result)

		return {
			bytesRead: result.byteLength,
			buffer: result
		}
	}

	async i2cWrite(address, length, bufferSource) {
		const bs8 = ArrayBuffer.isView(bufferSource) ?
			new Uint8Array(bufferSource.buffer, bufferSource.byteOffset, bufferSource.byteLength) :
			new Uint8Array(bufferSource)

		const _zeroLengthBuffer = await transfer(this.#port, Uint8Array.from([ 'w'.charCodeAt(0), address, length, ...bs8 ]), 0)

		return {
			bytesWritten: length
		}
	}
}

async function transfer(port, out_buff, targetCount) {
	const defaultWriter = port.writable.getWriter()
	const defaultReader = port.readable.getReader()

	try {
		console.log('ready?...')
		await defaultWriter.ready

		console.log('write...')
		await defaultWriter.write(out_buff)


		const in_buff = new Uint8Array(targetCount)

		let count = 0
		while (count < targetCount) {
			console.log('read...')
			const { value, done } = await defaultReader.read()
			in_buff.set(value, count)
			count += value.byteLength

			if(done) { break }
		}

		return in_buff.buffer
	} catch (e) { }
	finally {
		console.log('unlock the streams')
		await defaultReader.releaseLock()
		await defaultWriter.releaseLock()
	}
}

function makeDeviceLI(addr, port, ui) {
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
		makeDeviceButton.disabled = true
		//
		const deviceGuess = guessSelectElem.value

		const vbus = MashBus.from(port)

		ui.addI2CDevice({
			type: deviceGuess,
			bus: vbus,
			address: addr,
			port
		})
	}, { once: true })

	listElem.setAttribute('slot', 'vdevice-guess-list')
	listElem.appendChild(guessSelectElem)

	return listElem
}

export class MashUIBuilder {
	#port
	#ui

	static async builder(port, ui) {
		return new MashUIBuilder(port, ui)
	}

	constructor(port, ui) {
		this.#port = port
		this.#ui = ui
	}

	get title() {
		return 'Mash'
	}

	async open() {
		console.log('opening mash port')

		// at 1M baud, 8 bits, no parity, 1 stop bit (1000000 8N1).
		await this.#port.open({
			baudRate: 1000000,
			dataBits: 8,
			parity: 'none',
			stopBits: 1
		})
	}

	async close(forget = false) {
		if(forget) { await this.#port.forget() }
		return this.#port.close()
	}

	signature() {
		const info = this.#port.getInfo()
		return `PORT(USB(${info.usbVendorId},${info.usbProductId}))`
	}

	async buildCustomView() {
		const root = document.createElement('mash-mash')
		const addrBox = document.createElement('addr-display')
		const devList = document.createElement('ul')
		devList.toggleAttribute('data-device-list', true)

		root.appendChild(addrBox)
		root.appendChild(devList)

		const scan = document.createElement('button')
		scan.innerText = 'Scan'
		root.appendChild(scan)

		scan.addEventListener('click', event => {
			event.stopPropagation()

			Promise.resolve()
			.then(async () => transfer(this.#port, Uint8Array.from([ 'd'.charCodeAt(0) ]), 112))
			.then(rawResults => {
				const results = new Uint8Array(rawResults)
				console.log({ results })
				const startAddr = 0x08

				;([ ...results ]).forEach((result, index) => {
					const addr = startAddr + index
					const acked = result === 1
					if(!acked) { return }
					const li = makeDeviceLI(addr, this.#port, this.#ui)
					devList.appendChild(li)
				})

				addrBox.innerHTML = [ ...results ]
					.map((result, index) => {
						const addr = startAddr + index
						const acked = result === 1
						const arbitration = false
						const timeout = false

						const text = addr.toString(16).padStart(2, '0')
						return `
										<hex-display slot="${addr}"
											${acked ? 'acked' : '' }
											${arbitration ? 'arbitration' : '' }
											${timeout ? 'timeout' : '' }
											>
											${text}
										</hex-display>`
					})
					.reduce((acc, value) => {
						return acc + value
					}, '')


			})
		})

		const buttonGo = document.createElement('button')
		buttonGo.innerText = 'Go'
		root.appendChild(buttonGo)

		buttonGo.addEventListener('click', event => {
			event.stopPropagation()

			Promise.resolve()
			.then(async () => {
				return transfer(this.#port, Uint8Array.from([ 'e'.charCodeAt(0), 37 ]), 1)
			})
			.then(result => console.log('echo:', new Uint8Array(result)[0]))
			.catch(console.warn)

		})

		customElements.upgrade(root)
		return root
	}
}

