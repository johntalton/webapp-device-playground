
import { Tca9548a } from '@johntalton/tca9548a'
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'

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
		const response = await fetch('./custom-elements/tca9548.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('tca9548-config')
		if (root === null) { throw new Error('no root for template') }

		const allChannelInputs = root.querySelectorAll('input[name ^= "ch"]')

		const refresh = async () => {
			// allChannelInputs.forEach(i => i.disabled = true)

			const channels = await this.#device.getChannels()

			allChannelInputs.forEach(i => i.checked = false)
			channels.forEach(ch => {
				const chElem = root.querySelector(`input[name="ch${ch}"]`)
				chElem.checked = true
			})

			allChannelInputs.forEach(i => i.disabled = false)
		}

		root.addEventListener('change', asyncEvent(async e => {
			const channels = [ ...range(0, 7) ].map(ch => {
				const chElem = root.querySelector(`input[name="ch${ch}"]`)
				return chElem.checked ? ch : undefined
			}).filter(ch => ch !== undefined)

			await this.#device.setChannels(channels)

			await refresh()
		}))


		await refresh()

		return root
	}
}
