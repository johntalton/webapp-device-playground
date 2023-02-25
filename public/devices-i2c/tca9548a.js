
import { Tca9548a } from '@johntalton/tca9548a'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class TCA9548Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new TCA9548Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'TCA9548A Multiplexer' }


	async open() {
		this.#device = await Tca9548a.from(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('tca9548-config')

		const initialChannels = await this.#device.getChannels()
		console.log({ initialChannels })



		root.addEventListener('change', e => {
			const { channels } = e
			console.log('channel change request', channels)

			Promise.resolve()
				.then(async () => {

				await this.#device.setChannels(channels)
				const resultChannels = await this.#device.getChannels()
				console.log({ resultChannels })

			})
		})


		return root
	}
}
