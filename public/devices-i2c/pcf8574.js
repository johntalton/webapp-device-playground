import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { PCF8574 } from '@johntalton/pcf8574'

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


	get title() { return 'PCF8574' }

	async open() {
		this.#device = await PCF8574.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {

		const result = await this.#device.readPort()

		const root = document.createElement('div')
		root.innerHTML = `
			<title>PCF8574</title>
			GPIO:
			<input name="gpio0" type="checkbox" ${ result.p0 ? 'checked' : ''} />
			<input name="gpio1" type="checkbox" ${ result.p1 ? 'checked' : ''} />
			<input name="gpio2" type="checkbox" ${ result.p2 ? 'checked' : ''} />
			<input name="gpio3" type="checkbox" ${ result.p3 ? 'checked' : ''} />
			<input name="gpio4" type="checkbox" ${ result.p4 ? 'checked' : ''} />
			<input name="gpio5" type="checkbox" ${ result.p5 ? 'checked' : ''} />
			<input name="gpio6" type="checkbox" ${ result.p6 ? 'checked' : ''} />
			<input name="gpio7" type="checkbox" ${ result.p7 ? 'checked' : ''} />

			<button>Get</button>
    `

		const o = new MutationObserver(mutations => {
			console.log('mutation change has occurred', mutations)
		}).observe(root, { attributes: true, characterData: true, childList: true })

		root.addEventListener('change', event => {
			console.log('event change has occurred', event)

			Promise.resolve()
				.then(async () => {

					//const currentValues = await this.#device.readPort()

					await this.#device.writePort({
						p0: root.querySelector('input[name=gpio0]').checked ? 1 : 0,
						p1: root.querySelector('input[name=gpio1]').checked ? 1 : 0,
						p2: root.querySelector('input[name=gpio2]').checked ? 1 : 0,
						p3: root.querySelector('input[name=gpio3]').checked ? 1 : 0,
						p4: root.querySelector('input[name=gpio4]').checked ? 1 : 0,
						p5: root.querySelector('input[name=gpio5]').checked ? 1 : 0,
						p6: root.querySelector('input[name=gpio6]').checked ? 1 : 0,
						p7: root.querySelector('input[name=gpio7]').checked ? 1 : 0
					})

					//const newValues = await this.#device.readPort()


					//console.log(currentValues, newValues)
				})
				.catch(e => console.warn(e))
		})
		root.addEventListener('click', event => {
			const button = root.querySelector('button')
			if(event.target === button) {

				button.disabled = true

				// async
				Promise.resolve()
			 	.then(async () => {
						const result = await this.#device.readPort()

						console.log(result)


						button.disabled = false
					})
					.catch(e => console.warn(e))

			}
		})

		return root
	}
}

