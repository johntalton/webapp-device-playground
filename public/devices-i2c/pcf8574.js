import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { PCF8574 } from '@johntalton/pcf8574'
import { asyncEvent } from '../util/async-event.js'

export class PCF8574Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new PCF8574Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'PCF8574 (Gpio)' }

	async open() {
		this.#device = await PCF8574.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/pcf8574.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('pcf8574-config')
		if (root === null) { throw new Error('no root for template') }

		const pins = {
			input: [
				root.querySelector('input[name="gpio0"]'),
				root.querySelector('input[name="gpio1"]'),
				root.querySelector('input[name="gpio2"]'),
				root.querySelector('input[name="gpio3"]'),
				root.querySelector('input[name="gpio4"]'),
				root.querySelector('input[name="gpio5"]'),
				root.querySelector('input[name="gpio6"]'),
				root.querySelector('input[name="gpio7"]')
			],
			output: [
				root.querySelector('output[name="gpio0out"]'),
				root.querySelector('output[name="gpio1out"]'),
				root.querySelector('output[name="gpio2out"]'),
				root.querySelector('output[name="gpio3out"]'),
				root.querySelector('output[name="gpio4out"]'),
				root.querySelector('output[name="gpio5out"]'),
				root.querySelector('output[name="gpio6out"]'),
				root.querySelector('output[name="gpio7out"]')
			]
		}

		const refresh = async () => {
			const { p0, p1, p2, p3, p4, p5, p6, p7 } = await this.#device.readPort()

			pins.output[0].value = p0 ? 'High' : 'Low'
			pins.output[1].value = p1 ? 'High' : 'Low'
			pins.output[2].value = p2 ? 'High' : 'Low'
			pins.output[3].value = p3 ? 'High' : 'Low'
			pins.output[4].value = p4 ? 'High' : 'Low'
			pins.output[5].value = p5 ? 'High' : 'Low'
			pins.output[6].value = p6 ? 'High' : 'Low'
			pins.output[7].value = p7 ? 'High' : 'Low'

			pins.output[0]?.toggleAttribute('data-high', p0)
			pins.output[1]?.toggleAttribute('data-high', p1)
			pins.output[2]?.toggleAttribute('data-high', p2)
			pins.output[3]?.toggleAttribute('data-high', p3)
			pins.output[4]?.toggleAttribute('data-high', p4)
			pins.output[5]?.toggleAttribute('data-high', p5)
			pins.output[6]?.toggleAttribute('data-high', p6)
			pins.output[7]?.toggleAttribute('data-high', p7)

		}

		const refreshButton = root.querySelector('button[data-refresh]')
		refreshButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			refreshButton.disabled = true

			await refresh()

			refreshButton.disabled = false
		}))

		const configForm = root.querySelector('form')
		configForm.addEventListener('change', asyncEvent(async event => {
			console.log('event change has occurred')

			await this.#device.writePort({
				p0: pins.input[0].checked,
				p1: pins.input[1].checked,
				p2: pins.input[2].checked,
				p3: pins.input[3].checked,
				p4: pins.input[4].checked,
				p5: pins.input[5].checked,
				p6: pins.input[6].checked,
				p7: pins.input[7].checked
			})

			await refresh()
		}))

		return root
	}
}

