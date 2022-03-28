import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { SSD1306 } from '@johntalton/ssd1306'

export class SSD1306Builder {
	#definition
	#device

	static async builder(definition, ui) {
		return new SSD1306Builder(definition, ui)
	}

	constructor(definition, ui) {
		this.#definition = definition
	}

	get title() { return 'SSD 1306 Display' }

	signature() {}

	async open() {
		const { bus, address } = this.#definition
		const abus = new I2CAddressedBus(bus, address)
		this.#device = SSD1306.from(abus)

		await this.#device.fundamental.init()
	}

	async buildCustomView(selectionElem) {
		const root = document.createElement('ssd1306-config')

		root.textContent = 'My Little Display'

		return root
	}
}
