
import { PCA9536, SET, CLEAR } from '@johntalton/pca9536'
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { asyncEvent } from '../util/async-event.js'


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


	get title() { return 'PCA9536 GPIO 4-port' }


	async open() {
		this.#device = await PCA9536.from(this.#abus, {})
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		// fetch template
		const response = await fetch('./custom-elements/pca9536.html')
		if(!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('pca9536-config')
		if(root === null) { throw new Error('no root for template')}





		// gpio0: Enable Qwiic Power
		// gpio1: Enable I2C
		// const OUTPUT = CLEAR
		// const INPUT = SET
		// await this.#device.setConfiguration({
		// 	gpio0: OUTPUT,
		// 	gpio1: INPUT,
		// 	gpio2: OUTPUT,
		// 	gpio3: OUTPUT
		// })
		// const OFF = CLEAR
		// const ON = SET
		// await this.#device.setOutputPort({
		// 	gpio0: OFF,
		// 	gpio1: OFF,
		// 	gpio2: ON,
		// 	gpio3: OFF
		// })

		const elements = {
			gpio0: {
				direction: root.querySelector('[name="gpio0Direction"]'),
				polarity: root.querySelector('[name="gpio0InversePolarity"]'),
				output: root.querySelector('[name="gpio0Output"]'),
				input: root.querySelector('[name="gpio0Value"]')
			},
			gpio1: {
				direction: root.querySelector('[name="gpio1Direction"]'),
				polarity: root.querySelector('[name="gpio1InversePolarity"]'),
				output: root.querySelector('[name="gpio1Output"]'),
				input: root.querySelector('[name="gpio1Value"]')
			},
			gpio2: {
				direction: root.querySelector('[name="gpio2Direction"]'),
				polarity: root.querySelector('[name="gpio2InversePolarity"]'),
				output: root.querySelector('[name="gpio2Output"]'),
				input: root.querySelector('[name="gpio2Value"]')
			},
			gpio3: {
				direction: root.querySelector('[name="gpio3Direction"]'),
				polarity: root.querySelector('[name="gpio3InversePolarity"]'),
				output: root.querySelector('[name="gpio3Output"]'),
				input: root.querySelector('[name="gpio3Value"]')
			}

		}

		const refresh = async () => {
			const value = await this.#device.getInputPort()
			const output = await this.#device.getOutputPort()
			const polarity = await this.#device.getPolarityInversion()
			const config = await this.#device.getConfiguration()

			elements.gpio0.direction.value = config.gpio0
			elements.gpio1.direction.value = config.gpio1
			elements.gpio2.direction.value = config.gpio2
			elements.gpio3.direction.value = config.gpio3

			elements.gpio0.polarity.checked = polarity.gpio0 !== CLEAR
			elements.gpio1.polarity.checked = polarity.gpio1 !== CLEAR
			elements.gpio2.polarity.checked = polarity.gpio2 !== CLEAR
			elements.gpio3.polarity.checked = polarity.gpio3 !== CLEAR

			elements.gpio0.output.value = output.gpio0
			elements.gpio1.output.value = output.gpio1
			elements.gpio2.output.value = output.gpio2
			elements.gpio3.output.value = output.gpio3

			elements.gpio0.input.value = value.gpio0 === SET ? 'High' : 'Low'
			elements.gpio1.input.value = value.gpio1 === SET ? 'High' : 'Low'
			elements.gpio2.input.value = value.gpio2 === SET ? 'High' : 'Low'
			elements.gpio3.input.value = value.gpio3 === SET ? 'High' : 'Low'
		}

		const refreshButton = root.querySelector('[data-refresh]')
		refreshButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await refresh()
		}))

		const configForm = root.querySelector('form[data-config]')
		configForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()
			const update = event.target.getAttribute('data-update')

			if(update.includes('polarity')) {
				await this.#device.setPolarityInversion({
					gpio0: elements.gpio0.polarity.checked ? SET : CLEAR,
					gpio1: elements.gpio1.polarity.checked ? SET : CLEAR,
					gpio2: elements.gpio2.polarity.checked ? SET : CLEAR,
					gpio3: elements.gpio3.polarity.checked ? SET : CLEAR
				})
			}

			if(update.includes('output')) {
				await this.#device.setOutputPort({
					gpio0: Number.parseInt(elements.gpio0.output.value),
					gpio1: Number.parseInt(elements.gpio1.output.value),
					gpio2: Number.parseInt(elements.gpio2.output.value),
					gpio3: Number.parseInt(elements.gpio3.output.value)
				})
			}

			if(update.includes('direction')) {
				await this.#device.setConfiguration({
					gpio0: Number.parseInt(elements.gpio0.direction.value),
					gpio1: Number.parseInt(elements.gpio1.direction.value),
					gpio2: Number.parseInt(elements.gpio2.direction.value),
					gpio3: Number.parseInt(elements.gpio3.direction.value)
				})
			}

			await refresh()
		}))

		await refresh()

		return root
	}
}
