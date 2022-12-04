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

		const canvas = document.createElement('canvas')
		canvas.width = 128
		canvas.height = 64
		root.appendChild(canvas)

		const context = canvas.getContext('2d')

		context.lineWidth = 10;
		context.strokeRect(10, 10, 108, 44);
		// context.fillRect(130, 190, 40, 60);

		const img = context.getImageData(0, 0, 128, 64)

		img.data.forEach(value => {
			console.log(value)
		})


		return root
	}
}
