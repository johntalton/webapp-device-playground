import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS1841 } from '@johntalton/ds1841'

export class DS1841Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS1841Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'DS1841' }

	async open() {
		this.#device = new DS1841(this.#abus)

		const result = await this.#device.getTemperature()
		console.log({ result })
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('ds1841-config')


		return root
	}
}

