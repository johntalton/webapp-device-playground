import { FT232H } from '@johntalton/ft232h'
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

		await this.#device.open()

		if (this.#device.configuration === null) {
			await this.#device.selectConfiguration(1)
		}

		await this.#device.claimInterface(0);



		dumpUSBDevice(this.#device)



		// const bar = await this.#device.controlTransferOut({
		// 	requestType: 'vendor',
		// 	recipient: 'device',
		// 	request: 0, // Reset
		// 	value: 0,
		// 	index: 0

		// }, Uint8Array.from([ ]))

		// console.log({ bar })



		const bar = await this.#device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 0x80,
			value: 0,
			index: 0

		}, 64)

		console.log({ bar })






		const SIO_POLL_MODEM_STATUS_REQUEST = 0x05

		const length = 64
		const foo = await this.#device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: SIO_POLL_MODEM_STATUS_REQUEST,
			value: 0,
			index: 0

		}, length)

		console.log(foo)

		const usb_val0 = foo.data.getUint8(0)
		const usb_val1 = foo.data.getUint8(1)

		const status = {
			CTS: isBitSet(usb_val0, 4),
			DTS: isBitSet(usb_val0, 5),
			RI: isBitSet(usb_val0, 6),
			RLSD: isBitSet(usb_val0, 6),

			DR: isBitSet(usb_val1, 0),
			OE: isBitSet(usb_val1, 1),
			PE: isBitSet(usb_val1, 2),
			FE: isBitSet(usb_val1, 3),
			BI: isBitSet(usb_val1, 4),
			THRE: isBitSet(usb_val1, 5),
			TEMT: isBitSet(usb_val1, 6),
			ErrorRCVRFIFO: isBitSet(usb_val1, 7),
		}

		console.log('status', status)
		// bad command


	}

	async close() {
		return this.#device.close()
	}

	signature() {
		return 'USB()'

	}

	async buildCustomView(sectionElem) {
		const root = document.createElement('ft323-config')

		return root
  }
}