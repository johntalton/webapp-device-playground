
import { PCA9536, SET, CLEAR } from '@johntalton/pca9536'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

export class PCA9536Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new PCA9536Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'PCA9536 GPIO' }


	async open() {
		this.#device = await PCA9536.from(this.#abus, {})
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('pca9536-config')


		// await this.#device.setConfiguration({
		// 	gpio0: SET,
		// 	gpio1: SET,
		// 	gpio2: CLEAR,
		// 	gpio3: CLEAR
		// })

		const config = await this.#device.getConfiguration()
		console.log({ config })

		//await delayMs(10)


		// await this.#device.setOutputPort({
		// 	gpio0: CLEAR,
		// 	gpio1: CLEAR,
		// 	gpio2: SET,
		// 	gpio3: SET
		// })



		return root
	}
}
