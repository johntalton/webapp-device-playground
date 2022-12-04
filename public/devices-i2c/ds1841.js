import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS1841 } from '@johntalton/ds1841'

export class DS1841Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS1841Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'DS1841' }

	async open() {
		this.#device = new DS1841(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('ds1841-config')


		// const controls = await this.#device.getControls()

		const lutIndex = await this.#device.getLUTIndex()

		const ivr = await this.#device.getIVR()
		const temp = await this.#device.getTemperature()
		const volt = await this.#device.getVoltage()

		// const LOW = -40
		// const HIGHT = 101

		// const pos = (lutIndex > 0 && (lutIndex < HIGHT)) ? Math.trunc((lutIndex + 1) / 2) + 148 : -1
		// const neg = (pos === -1) ? Math.trunc((lutIndex - 1) / 2) + 21 : -1

		// console.log({ lutIndex, pos, neg })

		const lut = await this.#device.getLUT()

		console.log({ lut })

		const template = `
			<output>Temperature C: ${temp}</output>
			<output>Voltage mV: ${volt}</output>
			<output>IVR: ${ivr}</output>

			<fieldset>
				<legend></legend>

				<label for=""></label>
				<input id="" type="radio" selected />

				<label for=""></label>
				<input id="" type="radio" />
			</fieldset>

			<ol>
				${Object.entries(lut).map(([key, value]) => {
					const index = parseInt(key, 10)
					const selected = lutIndex === index

					const from = (index * 2 - 1) - 40
					const to = from + 1

					return `
						<li>
							<label for="">(${from} - ${to}) ${selected ? ' * ' : ''}</label>
							<input id="" type="text" value="${value}" />
						</li>
						`
				}).join('')}
			</ol>
			`

		root.innerHTML = template

		return root
	}
}

