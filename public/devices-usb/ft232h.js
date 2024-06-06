// import { FT232H } from '@johntalton/ft232h'
import { dumpUSBDevice } from '../util/usb-info.js'

export function isBitSet(value, bitToCheck) {
	return ((value >> bitToCheck) & 0b1) === 0b1
}

export const FT232H_PRODUCT_ID = 0x6014
export const FT232H_VENDOR_ID = 0x0403

export class FT232HUIBuilder {
	#device
	#ui

	static async builder(device, ui) {
		return new FT232HUIBuilder(device, ui)
	}

	constructor(device, ui) {
		this.#device = device
		this.#ui = ui
	}

	get title() {
		return 'FT232H'
	}

	async open() {
		console.log('open FT 232 H')

		// await this.#device.open()

		// if (this.#device.configuration === null) {
		// 	await this.#device.selectConfiguration(1)
		// }

		// await this.#device.claimInterface(0);



		// dumpUSBDevice(this.#device)



		// const bar = await this.#device.controlTransferOut({
		// 	requestType: 'vendor',
		// 	recipient: 'device',
		// 	request: 0, // Reset
		// 	value: 0,
		// 	index: 0

		// }, Uint8Array.from([ ]))

		// console.log({ bar })



		// const bar = await this.#device.controlTransferIn({
		// 	requestType: 'vendor',
		// 	recipient: 'device',
		// 	request: 0x80,
		// 	value: 0,
		// 	index: 0

		// }, 64)

		// console.log({ bar })




	}

	async close() {
		return this.#device.close()
	}

	signature() {
		return 'USB()'

	}

	async buildCustomView(sectionElem) {
		const root = document.createElement('ft323-config')

		root.innerText = ':)'

		return root
  }
}