
import { MCP23 } from '@johntalton/mcp23'
import { I2CAddressedTransactionBus } from '@johntalton/and-other-delights'

export class MCP23Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new MCP23Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedTransactionBus(bus, address)
		this.#device = new MCP23(this.#abus)
	}


	get title() { return 'MC23 GPIO' }


	async open() {
		this.#device = await MCP23.from(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('mcp23-config')

		const result = await this.#device.profile()
		console.log(result)
		root.innerText = ':)'


		return root
	}
}
