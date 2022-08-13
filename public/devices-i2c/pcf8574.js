import { I2CAddressedBus } from '@johntalton/and-other-delights'

export class PCF8574 {

}




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
		this.#device = new PCF8574()
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('div')
		root.innerHTML = `
			<title>PCF8574</title>
			GPIO:
			<input name="gpio0" type="checkbox" />
			<input name="gpio1" type="checkbox" />
			<input name="gpio2" type="checkbox" />
			<input name="gpio3" type="checkbox" />
			<input name="gpio4" type="checkbox" />
			<input name="gpio5" type="checkbox" />
			<input name="gpio6" type="checkbox" />
			<input name="gpio7" type="checkbox" />
    `
		return root
	}
}