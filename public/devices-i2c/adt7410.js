import { I2CAddressedBus } from '@johntalton/and-other-delights'
// import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import {
	ADT7410,
} from '@johntalton/adt7410'
import { asyncEvent } from '../util/async-event.js'
import { delayMs } from '../util/delay.js'
import { bindTabRoot } from '../util/tabs.js'


export class ADT7410Builder {
	#abus
	#device
	#id

	static async builder(definition, ui) {
		return new ADT7410Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'ADT7410' }

	async open() {
		this.#device = ADT7410.from(this.#abus)

		this.#id = await this.#device.getId()

		if(!this.#id.matchedVendor) {
			throw new Error('Vendor ID miss-match')
		}

	}

	async close() { }

	signature() { }

	async buildCustomView() {
		const response = await fetch('./custom-elements/adt7410.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('adt7410-config')
		if (root === null) { throw new Error('no root for template') }


		const configForm = root.querySelector('form[name="configuration"]')
		const modeSelect  = configForm?.querySelector('select[name="mode"]')
		const intCtModeSelect = configForm?.querySelector('select[name="comparisonMode"]')
		const faultQueueSelect = configForm?.querySelector('select[name="faultQueueLength"]')
		const resolutionSelect = configForm?.querySelector('select[name="resolution"]')
		const intPolaritySelect = configForm?.querySelector('select[name="intPolarity"]')
		const ctPolaritySelect  = configForm?.querySelector('select[name="ctPolarity"]')
		const resetButton = configForm?.querySelector('button[name="reset"]')

		const setPointsForm = root.querySelector('form[name="setPoints"]')
		const highNumber = setPointsForm?.querySelector('input[name="high"]')
		const lowNumber = setPointsForm?.querySelector('input[name="low"]')
		const criticalNumber = setPointsForm?.querySelector('input[name="critical"]')
		const hysteriaNumber = setPointsForm?.querySelector('input[name="hysteria"]')

		const outputForm = root.querySelector('form[name="output"]')
		const idOutput = outputForm?.querySelector('output[name="id"]')
		const temperatureOutput = outputForm?.querySelector('output[name="temperature"]')
		const highOutput = outputForm?.querySelector('output[name="high"]')
		const lowOutput = outputForm?.querySelector('output[name="low"]')
		const criticalOutput = outputForm?.querySelector('output[name="critical"]')
		const readyOutput = outputForm?.querySelector('output[name="ready"]')

		const statusRefreshButton = outputForm?.querySelector('button[name="refreshStatus"]')
		const pollTemperatureButton = outputForm?.querySelector('button[name="pollTemperature"]')
		const setSetPointsButton = setPointsForm?.querySelector('button[name="setSetPoints"]')


		//
		idOutput.value = `Manufacture: 0x${this.#id.manufactureId.toString(16).padStart(2, '0')}, Revision ${this.#id.revisionId}`


		const refreshStatus = async () => {
			const {
				high, low, critical, ready
			} = await this.#device.getStatus()

			highOutput.value = high ? '🔔 (true)' : ' 🔕'
			lowOutput.value = low ? '🔔 (true)' : ' 🔕'
			criticalOutput.value = critical ? '🔔 (true)' : ' 🔕'
			readyOutput.value = ready ? '👍 (true)' : ' 🛑 (false)'
		}

		const refreshOutput = async () => {
			const resolution = root.getAttribute('data-resolution')
			const mode16 = resolution === '16'
			const { temperatureC, high, low, critical } = await this.#device.getTemperature(mode16)

			temperatureOutput.value = `${temperatureC} ℃`

			if(high !== undefined) { highOutput.value = high ? '🔔 (true)' : ' 🔕' } else { highOutput.value = '-' }
			if(low !== undefined) { lowOutput.value = low ? '🔔 (true)' : ' 🔕' } else { lowOutput.value = '-' }
			if(critical !== undefined) { criticalOutput.value = critical ? '🔔 (true)' : ' 🔕' } else { criticalOutput.value = '-' }
			readyOutput.value = '-'
		}


		const refreshSetPoints = async () => {
			const high = await this.#device.getSetPointHigh()
			const low = await this.#device.getSetPointLow()
			const critical = await this.#device.getSetPointCritical()
			const hysteria = await this.#device.getSetPointHysteria()

			highNumber.value = high
			lowNumber.value = low
			criticalNumber.value = critical
			hysteriaNumber.value = hysteria
		}

		const refreshConfig = async () => {
			const {
				faultQueueLength,
				polarityCTActiveHigh,
				polarityINTActiveHigh,
				comparison,
				mode,
				resolution
			} = await this.#device.getConfiguration()

			modeSelect.value = mode
			intCtModeSelect.value = comparison
			faultQueueSelect.value = faultQueueLength
			resolutionSelect.value = resolution
			intPolaritySelect.value = polarityINTActiveHigh
			ctPolaritySelect.value = polarityCTActiveHigh

			root.setAttribute('data-resolution', resolution)
		}


		configForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			event.target.disabled = true

			await this.#device.setConfiguration({
				faultQueueLength: Number.parseInt(faultQueueSelect.value),
				polarityCTActiveHigh: ctPolaritySelect.value === 'true',
				polarityINTActiveHigh: intPolaritySelect.value === 'true',
				comparison: intCtModeSelect.value === 'true',
				mode: Number.parseInt(modeSelect.value),
				resolution: Number.parseInt(resolutionSelect.value)
			})

			if(modeSelect.value === '1') {
				await delayMs(240) // delay per spec after OneShot
			}

			await refreshConfig()

			event.target.disabled = false
		}))

		resetButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			resetButton.disabled = true

			await this.#device.reset()

			await refreshConfig()
			await refreshSetPoints()

			resetButton.disabled = false
		}))

		statusRefreshButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			statusRefreshButton.disabled = true

			await refreshStatus()

			statusRefreshButton.disabled = false
		}))

		pollTemperatureButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			pollTemperatureButton.disabled = true

			await refreshOutput()

			pollTemperatureButton.disabled = false
		}))

		setSetPointsButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			setSetPointsButton.disabled = true

			await this.#device.setSetPointCritical(Number.parseFloat(criticalNumber.value))
			await this.#device.setSetPointHigh(Number.parseFloat(highNumber.value))
			await this.#device.setSetPointLow(Number.parseFloat(lowNumber.value))
			await this.#device.setSetPointHysteria(Number.parseInt(hysteriaNumber.value))

			await refreshSetPoints()

			setSetPointsButton.disabled = false
		}))


		bindTabRoot(root)


		await refreshConfig()
		await refreshSetPoints()

		return root
	}
}

