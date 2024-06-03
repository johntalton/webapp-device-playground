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

		const root = document.createElement('pcf8574-config')
		root.innerHTML = `
			<form>
				<label>0</label>
				<input name="gpio0" type="checkbox" />
				<output name="gpio0out"></output>

				<label>1</label>
				<input name="gpio1" type="checkbox" />
				<output name="gpio1out"></output>

				<label>2</label>
				<input name="gpio2" type="checkbox" />
				<output name="gpio2out"></output>

				<label>3</label>
				<input name="gpio3" type="checkbox" />
				<output name="gpio3out"></output>

				<label>4</label>
				<input name="gpio4" type="checkbox" />
				<output name="gpio4out"></output>

				<label>5</label>
				<input name="gpio5" type="checkbox" />
				<output name="gpio5out"></output>

				<label>6</label>
				<input name="gpio6" type="checkbox" />
				<output name="gpio6out"></output>

				<label>7</label>
				<input name="gpio7" type="checkbox" />
				<output name="gpio7out"></output>
			</form>

			<button data-refresh>Refresh</button>
    `

		const refresh = async () => {
			const { p0, p1, p2, p3, p4, p5, p6, p7 } = await this.#device.readPort()

			root.querySelector('output[name="gpio0out"]').value = p0 ? 'High' : 'Low'
			root.querySelector('output[name="gpio1out"]').value = p1 ? 'High' : 'Low'
			root.querySelector('output[name="gpio2out"]').value = p2 ? 'High' : 'Low'
			root.querySelector('output[name="gpio3out"]').value = p3 ? 'High' : 'Low'
			root.querySelector('output[name="gpio4out"]').value = p4 ? 'High' : 'Low'
			root.querySelector('output[name="gpio5out"]').value = p5 ? 'High' : 'Low'
			root.querySelector('output[name="gpio6out"]').value = p6 ? 'High' : 'Low'
			root.querySelector('output[name="gpio7out"]').value = p7 ? 'High' : 'Low'

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
				p0: root.querySelector('input[name="gpio0"]').checked,
				p1: root.querySelector('input[name="gpio1"]').checked,
				p2: root.querySelector('input[name="gpio2"]').checked,
				p3: root.querySelector('input[name="gpio3"]').checked,
				p4: root.querySelector('input[name="gpio4"]').checked,
				p5: root.querySelector('input[name="gpio5"]').checked,
				p6: root.querySelector('input[name="gpio6"]').checked,
				p7: root.querySelector('input[name="gpio7"]').checked
			})

			await refresh()
		}))

		return root
	}
}

