import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DRV2605 } from '@johntalton/drv2605'

export class DRV2605Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DRV2605Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)

	}

	get title() { return 'DRV2605' }

	async open() {
		this.#device = new DRV2605(this.#abus)

	}

	async close() { }

	signature() { }

	async buildCustomView() {
		const root = document.createElement('drv2605-config')

		const status = await this.#device.getStatus()
		console.log(status, status.DEVICE_ID === 7)

		// const result = await this.#device.getLibrarySelection()
		// console.log(result)


		root.innerHTML = `

		`

		return root
	}
}