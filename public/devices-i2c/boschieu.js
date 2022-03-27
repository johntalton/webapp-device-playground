
import { BoschIEU } from '@johntalton/boschieu'
import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class BoschIEUBuilder {
	#abus
	#device

	static async builder(definition, ui) {
		return new BoschIEUBuilder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'Bosch IEU' }

	async open() {
		this.#device = await BoschIEU.detect(this.#abus)
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('boschieu-config')

		const pollButton = document.createElement('button')
		pollButton.textContent = 'Poll'
		root.appendChild(pollButton)

		pollButton.addEventListener('click', e => {
			//
			pollButton.disabled = true

			Promise.resolve()
				.then(async () => {
					//
					const profile = await this.#device.profile()
					console.log(profile)

					//
					await this.#device.calibration()

					//
					// const measurement = await this.#device.measurement()
					// console.log(measurement)

				})
				.catch(e => console.warn)
		}, { once: true })


    return root
  }
}