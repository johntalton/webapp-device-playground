
import { TCS34725 } from '@johntalton/tcs34725'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class TCS34725Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new TCS34725Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'TCS34725B RGB Sensor' }


	async open() {
		this.#device = new TCS34725(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('tcs34725-config')

    const div = document.createElement('div')
		div.toggleAttribute('data-sensor-color', true)
		div.style.setProperty('--sensor-color', 'pink')

		root.appendChild(div)

		await this.#device.setEnable({
			powerOn: true,
			active: true,
			wait: false,
			interrupts: false,
		})
		const p = await this.#device.getProfile()
		console.log(p)

		setInterval(async () => {
			const data = await this.#device.getData()
			console.log(data)

			const { r, g, b } = data.rgb

			div.style.setProperty('--sensor-color', `rgb(${r} ${g} ${b})`)


		}, 1000 * 1)

		return root
	}
}
