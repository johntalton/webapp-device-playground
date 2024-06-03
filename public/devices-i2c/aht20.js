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
		const root = document.createElement('aht20-config')

		root.innerHTML = `
			<form data-form-buttons method="dialog">
				<button type="button" data-reset>Reset</button>
				<button data-state>State</button>
				<!-- button data-init >Init</button -->
				<button data-trigger>Trigger</button>
				<button data-measurement>Measurement</button>
			</form>

			<label>Initialized</label>
			<output data-state-initialized>-</output>

			<label>Ready</label>
			<output data-state-ready>-</output>

			<label>Calibrated</label>
			<output data-state-calibrated>-</output>

			<label>Measurement Humidity (RH%)</label>
			<output data-measurement-humidity>-</output>

			<label>Measurement Temperature (°C)</label>
			<output data-measurement-temperature>-</output>

			<label>Measurement CRC</label>
			<output data-measurement-crc>-</output>
		`

		const buttonReset = root.querySelector('button[data-reset]')
		const buttonState = root.querySelector('button[data-state]')
		const buttonInit = root.querySelector('button[data-init]')
		const buttonTrigger = root.querySelector('button[data-trigger]')
		const buttonMeasurement = root.querySelector('button[data-measurement]')

		const outInit = root.querySelector('output[data-state-initialized]')
		const outReady = root.querySelector('output[data-state-ready]')
		const outCali = root.querySelector('output[data-state-calibrated]')
		const outHumi = root.querySelector('output[data-measurement-humidity]')
		const outTemp = root.querySelector('output[data-measurement-temperature]')
		const outCRC = root.querySelector('output[data-measurement-crc]')

		buttonReset.addEventListener('click', async e => { // async into the void
			await this.#device.reset()
		})

		buttonState.addEventListener('click', async e => { // async into the void
			const state = await this.#device.getState()

			outInit.innerText = state.initialized ? '👍' : '👎'
			outReady.innerText = state.busy ? '👎' : '👍'
			outCali.innerText = state.calibrated ? '👍' : '👎'
		})

		buttonInit?.addEventListener('click', async e => { // async into the void
			await this.#device.initialize()
		})

		buttonTrigger.addEventListener('click', async e => { // async into the void
			await this.#device.triggerMeasurement()
		})

		buttonMeasurement.addEventListener('click', async e => { // async into the void
			const result = await this.#device.getMeasurement()

			if(true) {
				outInit.innerText = result.initialized ? '(👍)' : '(👎)'
				outReady.innerText = result.busy ? '(👎)' : '(👍)'
				outCali.innerText = result.calibrated ? '(👍)' : '(👎)'
			}

			outHumi.innerText = Math.trunc(result.humidityRH * 100) / 100
			outTemp.innerText = Math.trunc(result.temperatureC * 100) / 100
			outCRC.innerText = result.validCRC ? '👍' : '👎'
		})

		return root
	}
}