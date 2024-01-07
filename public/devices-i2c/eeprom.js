import { I2CAddressedBus } from '@johntalton/and-other-delights'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

function toAddress16BE(address) {}
function readI2cBlock16(bus, address, length, into) {}
function writeI2cBlock16(bus, address, buffer) {}


class Common {
	/**
	 * @param {number} address
	 * @param {number} length
	 * @param {I2CAddressedBus} bus
	 * */
	static async read(bus, address, length, into) {
		const address16BE = new Uint16Array(1)
		const dv = new DataView(address16BE.buffer)
		dv.setUint16(0, address)

		return bus.readI2cBlock(address16BE, length, into)
	}

	/**
	 * @param {number} address
	 * @param {I2CAddressedBus} bus
	 * @param {ArraybufferLike|ArrayBufferView} buffer
	*/
	static async write(bus, address, buffer) {
		const address16BE = new Uint16Array(1)
		const dv = new DataView(address16BE.buffer)
		dv.setUint16(0, address)

		return bus.writeI2cBlock(address16BE, buffer)
	}
}

class EEPROM {
	#abus

	/** @param {I2CAddressedBus} abus  */
	static from(abus) { return new EEPROM(abus) }

	/** @param {I2CAddressedBus} abus  */
	constructor(abus) { this.#abus = abus }

	/**
	 * @param {number} address
	 * @param {number} length
	 * @returns {ArrayBufferLike}
	 * */
	async read(address, length, into = undefined) { return Common.read(this.#abus, address, length, into) }

	/** @param {ArrayBufferLike} source  */
	async write(address, source) { return Common.write(this.#abus, address, source) }
}





export class EEPROMBuilder {
	#abus
	#device

	static async builder(definition, ui) {
		return new EEPROMBuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'Generic EEPROM' }

	async open() {
		this.#device = EEPROM.from(this.#abus)


	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('eeprom-config')

/*
size: 512 Kb // 65,536 words of 8 bits each.
page count: 512 // in 512 pages of 128 bytes each
bytes per page: 128
page write time (ms): 5
poll busy: false
max write buffer size: 128 // 128−byte page write buffer
address size: 2
cycles: 1,000,000
*/

		root.innerHTML = `
			<form method="dialog">
				<select>
					<option>Manual</option>
					<option>Sparkfun QUIIC EEPROM 512 Kbit</option>
					<option>Adafruit 24LC32 I2C EEPROM Breakout - 32Kbit / 4 KB</option>
				</select>

				<fieldset>
					<!-- legend -->

					<label>Memory Size</label>
					<select>
						<option>512 K</option>
					</select>

					<label>Page Count</label>
					<select>
						<option>512</option>
					</select>

					<label>Bytes Per Page</label>
					<select>
						<option>128</option>
					</select>

					<label>Write Time (ms)</label>
					<input type="number" value="5" />

					<label>Max Write Buffer Size</label>
					<select>
						<option>128</option>
					</select>

					<label>Address Size</label>
					<select>
						<option>2</option>
						<option>1</option>
					</select>
				</fieldset>

			</form>

			<section data-fs>
				<span>Simple FS over free-list allocation</span>

				<div data-memory-map>
				${
					(new Array(512)).fill(0).map((_, index) => {
						return `<span page="${index}"></span>`
					})
					.join('')
				}
				</div>

				<div data-page-info>
					<output data-page-id></output>
				</div>

				<form method="dialog">
					<label>File System</label>
					<select>
						<option>MadeUp</option>
						<option>MadeUp - SubBlock</option>
						<option>NASA / EEPROMFS</option>
						<option>FAT 🤷🏻‍♂️</option>
					</select>

					<label>Upload file</label>
					<input data-upload-file type="file" />

					<button type="button">Upload 💾</button>
				</form>

				<fieldset>
					<legend>Utilities</legend>

					<button type="button">Erase ☠️</button>
					<button data-scan-fs type="button">Scan 🧐</button>
				</fieldset>

				<fieldset>
					<legend>Read / Write Byte</legend>

					<label>Address</label>
					<label>Value</label>
				</fieldset>
			</section>
		`

		const scanFSElem = root.querySelector('button[data-scan-fs')
		scanFSElem.addEventListener('click', event => {
			Promise.resolve()
				.then(async () => {
					const headerLength = 2

					const chunkCount = 512
					for(let chunk = 0; chunk < chunkCount; chunk += 1) {
						const address = chunk * 128
						const header = await this.#device.read(address, headerLength)
						const header8 = new Uint8Array(header)

						const MAGIC = 0x00

						if(header8[0] !== MAGIC) {}
						if(header8[1] & 0b00000001 === 1) {}
					}

				})
				.catch(e => console.warn(e))
		})

		const memoryMapElem = root.querySelector('[data-memory-map]')
		memoryMapElem.addEventListener('click', event => {
			memoryMapElem.querySelectorAll('[data-selected]').forEach(old => old.toggleAttribute('data-selected', false))
			event.target.toggleAttribute('data-selected', true)
		})


		const sectionFSElem = root
		sectionFSElem.addEventListener('drop', event => {
			event.preventDefault()
			event.stopPropagation();
			console.log('THIS IS .... DROP', event)
		})

		root.addEventListener('click', event => {
			if(event.target.getAttribute('type') !== 'button') { return }
			const input = root.querySelector('input[data-upload-file]')
			const [ file ] = input.files

			console.log(file.lastModified, file.name, file.type)

			file.arrayBuffer()
				.then(async result => {
					const firstChunk = new Uint8Array(result, 0, 32)
					console.log({ byteLength: firstChunk.byteLength, firstChunk })

					// await this.#device.write(0x00_40, firstChunk)

					// await delayMs(5)

					const value = await this.#device.read(0x00_40, 32)
					console.log(value, new Uint8Array(value))

				})
				.catch(e => console.warn(e))
		})

		return root
	}
}
