
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

		await this.#device.setProfile({
			mode: 'NORMAL',

			oversampling_t: 1,
			oversampling_p: 1,
			filter_coefficient: 7,

			fifo: {
				temp: true,
				press: false,
				time: true,

				data: 'unfiltered'
			}
		})


		const profile = await this.#device.profile()
		console.log(profile)
		//
		await this.#device.calibration()
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('boschieu-config')

		const pollButton = document.createElement('button')
		pollButton.textContent = 'Measure'
		root.appendChild(pollButton)

		const outputElem = document.createElement('output')
		outputElem.textContent = 'no reading yet'
		root.appendChild(outputElem)

		pollButton.addEventListener('click', e => {
			//
			pollButton.disabled = true

			Promise.resolve()
				.then(async () => {
					//
					const measurement = await this.#device.measurement()
					console.log(measurement)

					outputElem.textContent = Math.round(measurement.temperature.C * 100) / 100 + ' C'

					pollButton.disabled = false
				})
				.catch(e => console.warn)
		}, { once: false })


    return root
  }
}