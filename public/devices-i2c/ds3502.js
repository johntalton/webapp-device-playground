import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS3502 } from '@johntalton/ds3502'

import { Waves } from '../util/wave.js'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))


async function potScript(device, options) {
	const sinWave = Waves.sin(options)
	for await (const value of sinWave) {
		await delayMs(100)
		await device.setProfile({ WR: value })
	}
}


export class DS3502Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS3502Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'DS3502 Digital Potentiometer' }


	async open() {
		this.#device = await DS3502.from(this.#abus, {})
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('ds3502-config')

		const toggleSinButton = document.createElement('button')
		toggleSinButton.textContent = 'Wave 🌊'
		root.appendChild(toggleSinButton)


		let controller
		toggleSinButton.addEventListener('click', e => {
			if(controller === undefined) {
				controller = new AbortController()
				const { signal } = controller

				toggleSinButton.textContent = 'Wave 🛑'

				Promise.resolve(delayMs(1))
					.then(() => potScript(this.#device, { periodMs: 10 * 1000, signal }))
					.then(() => {
						console.log('script has ended')
						toggleSinButton.textContent = 'Wave 🌊'
						toggleSinButton.disabled = false
					})
					.catch(console.warn)
			}
			else {
				controller.abort('user click stop')
				toggleSinButton.disabled = true
				controller = undefined
			}
		}, { once: false })



		// root.addEventListener('change', e => {
		// 	const { channels } = e
		// 	console.log('channel change request', channels)

		// 	Promise.resolve()
		// 		.then(async () => {

		// 		await this.#device.setChannels(channels)
		// 		const resultChannels = await this.#device.getChannels()
		// 		console.log({ resultChannels })

		// 	})
		// })


		return root
	}
}