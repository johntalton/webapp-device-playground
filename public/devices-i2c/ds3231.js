import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS3231 } from '@johntalton/ds3231'

export class DS3231Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS3231Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'DS3231 (RTC)' }

	async open() {
		this.#device = await DS3231.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const div = document.createElement('div')

		const century = 2000
		const now = new Date(Date.now())

		{
		const seconds = now.getUTCSeconds()
		const minutes = now.getUTCMinutes()
		const hours = now.getUTCHours()

		const date = now.getUTCDate()
		const month = now.getUTCMonth() + 1
		const year = now.getUTCFullYear() - century

		// await this.#device.setStatus({ clearOscillatorStoppedFlag: true })
		// await this.#device.setTime({
		// 	seconds, minutes, hours, date, month, year
		// })
		// await this.#device.setStatus({ oscillatorEnabled: true })
		}

		const temp = await this.#device.getTemperature()
		div.innerText = `${temp.temperatureC} ℃`

		const time = await this.#device.getTime()

		const { year, month, date, hours, minutes, seconds } = time

		//
		const storedDate = new Date(Date.UTC(
			century + year,
			month - 1,
			date,
			hours, minutes, seconds))

		console.log(storedDate)

		const ctrl = await this.#device.getControl()
		console.log(ctrl)

		const status = await this.#device.getStatus()
		console.log(status)

		return div
	}
}
