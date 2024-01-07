import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { AHT20 } from '@johntalton/aht20'

export class AHT20Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new AHT20Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'AHT20' }

	async open() {
		this.#device = AHT20.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView() {
		const root = document.createElement('div')

		root.innerHTML = `
			<button data-reset>Reset</button>
			<button data-state>State</button>
			<button data-init>Init</button>
			<button data-trigger>Trigger</button>
			<button data-measurement>Measurement</button>

			<label>Initialized</label>
			<output data-state-initialized>-</output>

			<label>Busy</label>
			<output data-state-busy>-</output>

			<label>Calibrated</label>
			<output data-state-calibrated>-</output>

			<label>Measurement Humidity</label>
			<output data-measurement-humidity>-</output>

			<label>Measurement Temperature</label>
			<output data-measurement-temperature>-</output>
		`

		const buttonReset = root.querySelector('button[data-reset]')
		const buttonState = root.querySelector('button[data-state]')
		const buttonInit = root.querySelector('button[data-init]')
		const buttonTrigger = root.querySelector('button[data-trigger]')
		const buttonMeasurement = root.querySelector('button[data-measurement]')

		const outInit = root.querySelector('output[data-state-initialized]')
		const outBusy = root.querySelector('output[data-state-busy]')
		const outCali = root.querySelector('output[data-state-calibrated]')
		const outHumi = root.querySelector('output[data-measurement-humidity]')
		const outTemp = root.querySelector('output[data-measurement-temperature]')

		buttonReset.addEventListener('click', async e => { // async into the void
			await this.#device.reset()
		})

		buttonState.addEventListener('click', async e => { // async into the void
			const state = await this.#device.getState()

			outInit.innerText = state.initialized ? '👍' : '👎'
			outBusy.innerText = state.busy ? '👎' : '👍'
			outCali.innerText = state.calibrated ? '👍' : '👎'
		})

		buttonInit.addEventListener('click', async e => { // async into the void
			await this.#device.initialize()
		})

		buttonTrigger.addEventListener('click', async e => { // async into the void
			await this.#device.triggerMeasurement()
		})

		buttonMeasurement.addEventListener('click', async e => { // async into the void
			const result = await this.#device.getMeasurement()

			outHumi.innerText = result.humidityRH
			outTemp.innerText = result.temperatureC
		})

		return root
	}
}