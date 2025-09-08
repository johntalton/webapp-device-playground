import { I2CAddressedBus, I2CAddressedTransactionBus } from '@johntalton/and-other-delights'

import { EEPROM } from '@johntalton/eeprom'
import { EEFS, EEFS_SUCCESS, format, O_CREAT } from '@johntalton/eefs'
import { EEPROMArrayBuffer } from '@johntalton/eefs/eeprom-array-buffer'
import { EEFSStorageManager } from '@johntalton/eefs/storage'
import { CyclicFS } from '@johntalton/cyclic-fs'

import { range } from '../util/range.js'
import { asyncEvent } from '../util/async-event.js'
import { bindTabRoot } from '../util/tabs.js'

export class EEPROMBuilder {
	#atbus
	/** @type {EEPROM} */
	#device
	/** @type {EEPROMArrayBuffer} */
	#eefsBacking

	static async builder(definition, ui) {
		return new EEPROMBuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition
		// this.#atbus = new I2CAddressedTransactionBus(bus, address)
		this.#atbus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'Generic EEPROM' }

	signature() { }

	async open() {

		this.#device = new EEPROM(this.#atbus, { readPageSize: 32, writePageSize: 32 })
	}

	async close() { }

	get device() { return this.#device }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/generic-eeprom.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('generic-eeprom-config')
		if (root === null) { throw new Error('no root for template') }


		const getSelectByteSize = () => {
			const size = parseInt(memorySizeSelect.value)
			return size * 1024 / 8
		}

		const refreshEEFSBacking = () => {
			const sizeBytes = getSelectByteSize()

			if(this.#eefsBacking === undefined) {
				const buffer = new ArrayBuffer(sizeBytes)
				this.#eefsBacking = new EEPROMArrayBuffer(buffer)
			}
			else {

			}
		}


		// await this.device.write(16, Uint8Array.from([ 37, 42 ]))
		// const buffer = await this.device.read(16, 2)
		// console.log(buffer)

		const writePageSizeSelect = root.querySelector('select[name="WriteBufferSize"]')
		const memorySizeSelect = root.querySelector('select[name="MemorySize"]')
		// const memoryMap = root.querySelector('memory-map')

		// const refreshMemoryMap = async () => {
		// 	const size = parseInt(memorySizeSelect.value)
		// 	const sizeBytes = size * 1024 / 8
		// 	// console.log(sizeBytes)

		// 	memoryMap.innerHTML = ''
		// 	for(const page of range(0, sizeBytes - 1)) {
		// 		const span = document.createElement('SPAN')
		// 		span.setAttribute('page', page)
		// 		memoryMap.append(span)
		// 	}

		// }

		// await refreshMemoryMap()


		memorySizeSelect.addEventListener('change', asyncEvent(async event => {
			const size = parseInt(memorySizeSelect.value)
			const sizeBytes = size * 1024 / 8

			//await refreshMemoryMap()
		}))







		const peekAddressNumber = root.querySelector('input[name="PeekAddress"]')
		const peekLengthNumber = root.querySelector('input[name="PeekLength"]')
		const peekOutput = root.querySelector('output[name="PeekResults"]')
		const peekTypeSelect = root.querySelector('select[name="PeekType"]')
		const peekLittleEndianCheckbox = root.querySelector('input[name="PeekLittleEndian"]')
		const peekButton = root.querySelector('button[command="peek"]')
		peekButton.addEventListener('click', asyncEvent(async event => {
			const address = parseInt(peekAddressNumber.value)
			const length = parseInt(peekLengthNumber.value)
			const type = peekTypeSelect.value

			const ab = await this.device.read(address, length)
			// console.log(ab)

			const dv = ArrayBuffer.isView(ab) ?
					new DataView(ab.buffer, ab.byteOffset, ab.byteLength) :
					new DataView(ab, 0, ab.byteLength)

			const stride = (type === 'U8') ? 1 :
				(type === 'U16') ? 2 :
				(type === 'U32') ? 4 :
				0

			const littleEndian = peekLittleEndianCheckbox.checked

			if(type === 'UTF8') {
				const decoder = new TextDecoder('utf-8', { fatal: false })
				peekOutput.value = `"${decoder.decode(ab)}"`
			}
			else if(['U8', 'U16', 'U32'].includes(type)) {
				peekOutput.value = range(0, dv.byteLength - 1, stride)
					.map(offset => {
						switch(type) {
							case 'U8':
								return dv.getUint8(offset)
								break
							case 'U16':
								return dv.getUint16(offset, littleEndian)
								break
							case 'U32':
								return dv.getUint32(offset, littleEndian)
								break
							default:
								throw new Error('unknown type')
						}
					})
					.map(u => '0x' + u.toString(16).padStart(2 * stride, '0').toUpperCase())
					.reduce((acc, s) => acc + ' ' + s)
			}
			else {
				// unknown type
			}

		}))

		const peekAddressPageUpButton = root.querySelector('button[command="--peek-address-up"]')
		const peekAddressPageDownButton = root.querySelector('button[command="--peek-address-down"]')
		peekAddressPageUpButton.addEventListener('click', asyncEvent(async event => {
			const address = parseInt(peekAddressNumber.value)
			const pageSize = parseInt(writePageSizeSelect.value)

			const step = (pageSize - (address % pageSize))
			const nextAddress = address + step
			peekAddressNumber.value = nextAddress

		}))
		peekAddressPageDownButton.addEventListener('click', asyncEvent(async event => {
			const address = parseInt(peekAddressNumber.value)
			const pageSize = parseInt(writePageSizeSelect.value)

			const step = (address % pageSize)
			const prevAddress = Math.max(0, address - (step === 0 ? pageSize : step))
			peekAddressNumber.value = prevAddress
		}))









		const selectFSAttribute = root.querySelector('[data-selected-fs]')?.getAttributeNode('data-selected-fs')
		const fileSystemSelect = root.querySelector('select[name="FileSystem"]')
		fileSystemSelect?.addEventListener('change', asyncEvent(async event => {
			selectFSAttribute.value = fileSystemSelect.value
		}))






		const cyclicListButton = root.querySelector('button[command="--cyclic-list"]')
		cyclicListButton?.addEventListener('click', asyncEvent(async event => {
			const byteLength = 64
			const handle = await CyclicFS.init(this.device, byteLength, { stride: 8 })
			for await (const slot of CyclicFS.list(this.device, handle)) {
				console.log(slot)
			}

		}))







		const baseAddressNumber = root.querySelector('input[name="EEFSBaseAddress"]')

		const clearButton = root.querySelector('button[command="clear"]')
		clearButton.addEventListener('click', asyncEvent(async event => {
			const size = parseInt(memorySizeSelect.value)
			const sizeBytes = size * 1024 / 8
			const pageSize = parseInt(writePageSizeSelect.value)

			for(const page of range(0, sizeBytes - pageSize, pageSize)) {
				// fill with 0xFF as that how it cam from manufacture
				await this.device.write(page, Uint8Array.from([ ...range(0, pageSize - 1).map(_ => 0xFF) ]))
			}
		}))

		const formatButton = root.querySelector('button[data-format-fs]')
		formatButton.addEventListener('click', asyncEvent(async event => {
			const size = parseInt(memorySizeSelect.value)
			const sizeBytes = size * 1024 / 8

			if(fileSystemSelect.value !== 'EEFS') { return }

			const BASE_ADDRESS = 0
			await format(this.device, BASE_ADDRESS, sizeBytes)

		}))

		const eefsLoadButton = root.querySelector('button[command="--eefs-load"]')
		eefsLoadButton.addEventListener('click', asyncEvent(async event => {
			// refreshEEFSBacking()

			const baseAddress = parseInt(baseAddressNumber.value)


			const sizeBytes = getSelectByteSize()
			const buffer = await this.device.read(baseAddress, sizeBytes, new ArrayBuffer(sizeBytes))
			this.#eefsBacking = new EEPROMArrayBuffer(buffer)

			const options = {
				eeprom: this.#eefsBacking
			}

			// console.log(await this.#eefsBacking.read(0, 24))

			const handle = await EEFS.initFS(options, 0)
			if(handle.status !== EEFS_SUCCESS) { throw new Error('init failure') }

			console.log('init memory', handle)
			for await(const x of EEFS.listInodes(handle)) {
				console.log('memory fs', x)
			}

			await EEFS.freeFS(handle)
		}))

		const eefsStoreButton = root.querySelector('button[command="--eefs-store"]')
		eefsStoreButton.addEventListener('click', asyncEvent(async event => {

		}))

		const scanButton = root.querySelector('button[data-scan-fs]')
		scanButton.addEventListener('click', asyncEvent(async event => {
			const size = parseInt(memorySizeSelect.value)
			const sizeBytes = size * 1024 / 8

			if(fileSystemSelect.value !== 'EEFS') { return }




			const BASE_ADDRESS = 0
			const storage = await EEFSStorageManager.from(this.device, { baseAddress: BASE_ADDRESS })

			const root = await storage.getDirectory()

			// {
			// 	console.log('write new file')
			// 	const fileHandle = await root.getFileHandle('README.md', { create: true })
			// 	const writable = await fileHandle.createWritable({ })
			// 	const writer = writable.getWriter()
			// 	console.log('write new file body')
			// 	await writer.write(storage.filesystem.encoder.encode('The quick brown fox jumped over the lazy sleeping dog'))
			// 	console.log('write new file body end')
			// 	await writer.close()
			// 	writer.releaseLock()
			// }

			// {
			// 	console.log('write new file')
			// 	const fileHandle = await root.getFileHandle('config.json', { create: true })
			// 	const writable = await fileHandle.createWritable({ })
			// 	const writer = writable.getWriter()
			// 	console.log('write new file body')
			// 	await writer.write(storage.filesystem.encoder.encode(JSON.stringify({
			// 		value: 42,
			// 		enabled: true,
			// 		name: 'sensor:0:12'
			// 	})))
			// 	console.log('write new file body end')
			// 	await writer.close()
			// 	writer.releaseLock()

			// }

			for await(const x of EEFS.listInodes(storage.filesystem)) {
				console.log(x)
			}



			console.log('FS Listing:')
			for await (const [name, handle] of root) {
				if (handle.kind === 'file') {
					console.log(`${root.name}${name}`)
					const file = await handle.getFile()
					console.log(`\tlastModified: ${new Date(file.lastModified)}`)
					console.log(`\tbyteSize: ${file.size}`)
					console.log(`\t"${(await file.text())}"`)
				}
				else if (handle.kind === 'directory') {

				}
			}

			// const buffer = await this.device.read(0, 32)
			// console.log(buffer)
		}))





		const eefsFSDisplayDropTarget = root.querySelector('fs-display')
		eefsFSDisplayDropTarget.addEventListener('dragover', asyncEvent(async event => {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'copy'

		}))
		eefsFSDisplayDropTarget.addEventListener('drop', asyncEvent(async event => {
			event.preventDefault()

			refreshEEFSBacking()
			const options = {
				eeprom: this.#eefsBacking
			}
			const handle = await EEFS.initFS(options, 0)
			if(handle.status !== EEFS_SUCCESS) {
				console.error(`init failure ${handle.status} ${handle.why}`)
				throw new Error('init failure')
			}

			for(const file of event.dataTransfer.files) {
				console.log('file', file.name, file.size, file.type, file.lastModified)
				const content = await file.arrayBuffer()

				console.log(content.byteLength)

				const fd = await EEFS.create(handle, file.name)
				if(fd < 0) {
					console.error(`issue creating ${fd}`)
					throw new Error('and issue')
				}
				await EEFS.write(handle, fd, content, file.size)
				await EEFS.close(handle, fd)

			}

			for await(const x of EEFS.listInodes(handle)) {
				console.log('memory fs', x)
			}

		}))











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



		// const scanFSElem = root.querySelector('button[data-scan-fs')
		// scanFSElem.addEventListener('click', event => {
		// 	Promise.resolve()
		// 		.then(async () => {
		// 			const headerLength = 2

		// 			const chunkCount = 512
		// 			for(let chunk = 0; chunk < chunkCount; chunk += 1) {
		// 				const address = chunk * 128
		// 				const header = await this.#device.read(address, headerLength)
		// 				const header8 = new Uint8Array(header)

		// 				const MAGIC = 0x00

		// 				if(header8[0] !== MAGIC) {}
		// 				if(header8[1] & 0b00000001 === 1) {}
		// 			}

		// 		})
		// 		.catch(e => console.warn(e))
		// })

		// const memoryMapElem = root.querySelector('[data-memory-map]')
		// memoryMapElem.addEventListener('click', event => {
		// 	memoryMapElem.querySelectorAll('[data-selected]').forEach(old => old.toggleAttribute('data-selected', false))
		// 	event.target.toggleAttribute('data-selected', true)
		// })


		// const sectionFSElem = root
		// sectionFSElem.addEventListener('drop', event => {
		// 	event.preventDefault()
		// 	event.stopPropagation();
		// 	console.log('THIS IS .... DROP', event)
		// })

		// root.addEventListener('click', event => {
		// 	if(event.target.getAttribute('type') !== 'button') { return }
		// 	const input = root.querySelector('input[data-upload-file]')
		// 	const [ file ] = input.files

		// 	console.log(file.lastModified, file.name, file.type)

		// 	file.arrayBuffer()
		// 		.then(async result => {
		// 			const firstChunk = new Uint8Array(result, 0, 32)
		// 			console.log({ byteLength: firstChunk.byteLength, firstChunk })

		// 			// await this.#device.write(0x00_40, firstChunk)

		// 			// await delayMs(5)

		// 			const value = await this.#device.read(0x00_40, 32)
		// 			console.log(value, new Uint8Array(value))

		// 		})
		// 		.catch(e => console.warn(e))
		// })


		bindTabRoot(root)
		return root
	}
}
