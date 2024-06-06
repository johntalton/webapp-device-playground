import { I2CAddressedBus } from '@johntalton/and-other-delights'

import {
	AGS02MA,
} from '@johntalton/ags02ma'


export class AGS02MABuilder {
	#abus
	#device

	static async builder(definition, ui) {
		return new AGS02MABuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'AGS02MA (Gas)' }

	async open() {
		this.#device = AGS02MA.from(this.#abus)

		const version = await this.#device.getVersion()
    console.log(version)

    const resistance = await this.#device.getResistance()
    console.log(resistance)

    const tvoc = await this.#device.getTVOC()
    console.log(tvoc)

	}

	async close() { }

	signature() { }

	async buildCustomView() {
		const root = document.createElement('ags02ma-config')


		return root
	}
}

