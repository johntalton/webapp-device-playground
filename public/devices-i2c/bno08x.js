
import { BNO08X } from '@johntalton/bno08x'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class BNO08XBuilder {
	#bus
	#device

	static async builder(definition, ui) {
		return new BNO08XBuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#bus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'BNO 08x' }

	async open() {
		this.#device = BNO08X.from(this.#bus)

    const foo = await this.#device.getAcceleration()
    console.log(foo)

    const bar = await this.#device.getAcceleration()
    console.log(bar)
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('bno08x-config')



    return root
  }
}