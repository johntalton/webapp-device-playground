import { I2CAddressedBus } from '@johntalton/and-other-delights'
// import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import {
	ADT7410,

	OPERATION_MODE,
	FAULT_QUEUE_COUNT,
	RESOLUTION,
	INT_CT_MODE
} from '@johntalton/adt7410'
import { asyncEvent } from '../util/async-event.js'
import { delayMs } from '../util/delay.js'


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





		// function appendSelect(root, label, currentValue, options) {
		// 	const elem = document.createElement('select')
		// 	// elem.setAttribute('name', 'mode')
		// 	const elemLabel = document.createElement('label')
		// 	elemLabel.textContent = label

		// 	options.forEach(({ value, label }) => {
		// 		const optionElem = document.createElement('option')
		// 		optionElem.innerText = label
		// 		optionElem.value = value

		// 		if(currentValue === value) {
		// 			optionElem.selected = true
		// 		}

		// 		elem.appendChild(optionElem)
		// 	})

		// 	root.appendChild(elemLabel)
		// 	root.appendChild(elem)

		// 	return elem
		// }

		// function appendInputNumber(root, label, currentValue, min, max, step) {
		// 	const elem = document.createElement('input')
		// 	// elem.setAttribute('type', 'range')
		// 	elem.setAttribute('type', 'number')
		// 	elem.setAttribute('min', min)
		// 	elem.setAttribute('max', max)
		// 	elem.setAttribute('step', step)

		// 	elem.value = currentValue

		// 	const elemLabel = document.createElement('label')
		// 	elemLabel.textContent = label

		// 	root.appendChild(elemLabel)
		// 	root.appendChild(elem)

		// 	return elem
		// }

		// risk async
		// const profile = await Promise.all([
		// 	await this.#device.getConfiguration(),
		// 	await this.#device.getSetpointHigh(),
		// 	await this.#device.getSetpointLow(),
		// 	await this.#device.getSetpointCritical(),
		// 	await this.#device.getSetpointHysteria()
		// ])
		// .then(([
		// 	config,
		// 	setpointH,
		// 	setpointL,
		// 	setpointC,
		// 	setpointHyst
		// ]) => ({
		// 	...config,
		// 	setpoints: {
		// 	  high: setpointH,
		// 	  low: setpointL,
		// 	  critical: setpointC,
		// 	  hysteria: setpointHyst
		// 	}
		// }))


		// const root = document.createElement('adt7410-config')

		// const configForm = document.createElement('form')
		// const setpointForm = document.createElement('form')

		// const modeElem = appendSelect(configForm, 'Mode', profile.operationMode, [
		// 	{
		// 		value: OPERATION_MODE.CONTINUOUS,
		// 		label: 'Continuous'
		// 	},
		// 	{
		// 		value: OPERATION_MODE.ONE_SHOT,
		// 		label: 'One Shot',
		// 	},
		// 	{
		// 		value: OPERATION_MODE.ONE_SPS,
		// 		label: '1 SPS',
		// 	},
		// 	{
		// 		value: OPERATION_MODE.SHUTDOWN,
		// 		label: 'Shutdown'
		// 	}
		// ])

		// const intctModeElem = appendSelect(configForm, 'INT/CT Mode', profile.INTCTMode, [
		// 	{
		// 		value: INT_CT_MODE.INTERRUPT,
		// 		label: 'Interrupt'
		// 	},
		// 	{
		// 		value: INT_CT_MODE.COMPARATOR,
		// 		label: 'Comparator'
		// 	}
		// ])

    // const faultElem = appendSelect(configForm, 'Fault Queue Length', profile.faultQueue, [
		// 	{
		// 		value: FAULT_QUEUE_COUNT.ONE,
		// 		label: '1 (one)'
		// 	},
		// 	{
		// 		value: FAULT_QUEUE_COUNT.TWO,
		// 		label: '2 (two)'
		// 	},
		// 	{
		// 		value: FAULT_QUEUE_COUNT.THREE,
		// 		label: '3 (three)'
		// 	},
		// 	{
		// 		value: FAULT_QUEUE_COUNT.FOUR,
		// 		label: '4 (four)'
		// 	}
		// ])

    // const resElem = appendSelect(configForm, 'Resolution', profile.resolution, [
		// 	{
		// 		value: RESOLUTION.THIRTEEN,
		// 		label: '13-bit - 0.0625°C'
		// 	},
		// 	{
		// 		value: RESOLUTION.SIXTEEN,
		// 		label: '16-bit - 0.0078°C'
		// 	}
		// ])

		// const fieldsetElem = document.createElement('fieldset')

		// const spHighElem = appendInputNumber(fieldsetElem, 'High', profile.setpoints.high, 0, 100, .5) // 1/128
		// const spLowElem = appendInputNumber(fieldsetElem, 'Low', profile.setpoints.low, 0, 100, .5)
		// const spCritElem = appendInputNumber(fieldsetElem, 'Critical', profile.setpoints.critical, 0, 100, .5)
		// const spHystElem = appendInputNumber(fieldsetElem, 'Hysteria', profile.setpoints.hysteria, 0, 15, 1)

		// const setSetpointsButton = document.createElement('button')
		// setSetpointsButton.innerText = 'Set 🌡'

		// setpointForm.appendChild(fieldsetElem)
		// setpointForm.appendChild(setSetpointsButton)

		// setSetpointsButton.addEventListener('click', event => {
		// 	event.stopPropagation()
		// 	event.preventDefault()

		// 	setSetpointsButton.disabled = true

		// 	const spH = spHighElem.value
		// 	const spL = spLowElem.value
		// 	const spC = spCritElem.value
		// 	const spHyst = spHystElem.value

		// 	console.log('setting setpoints', { spH, spL, spC, spHyst })

		// 	Promise.resolve()
		// 		.then(() => this.#device.setSetpointHigh(spH))
		// 		.then(() => this.#device.setSetpointLow(spL))
		// 		.then(() => this.#device.setSetpointCritical(spC))
		// 		.then(() => this.#device.setSetpointHysteria(spHyst))
		// 		.then(() => {
		// 			setSetpointsButton.disabled = false
		// 		})
		// 		.catch(e => console.warn(e))
		// })

		// setpointForm.addEventListener('change', event => {

		// })

		// configForm.addEventListener('change', event => {
		// 	const operationMode = Number.parseInt(modeElem.value)
		// 	const resolution = Number.parseInt(resElem.value)
		// 	const faultQueue = Number.parseInt(faultElem.value)

		// 	console.log({ operationMode, resolution })

		// 	this.#device.setConfiguration({
		// 		faultQueue,
		// 		CTPolarity: 0,
		// 		INTPolarity: 0,
		// 		INTCTMode: 0,
		// 		operationMode,
		// 		resolution
		// 	})
		// 		.then(async () => {
		// 			// config updated
		// 			console.log('success', await this.#device.getConfiguration())
		// 		})
		// 		.catch(e => console.warn(e))
		// })

    // root.appendChild(configForm)
		// root.appendChild(setpointForm)


		// const controlsElem = document.createElement('div')
		// controlsElem.toggleAttribute('data-controls', true)

    // const resetButton = document.createElement('button')
		// resetButton.innerText = 'reset ⚡️'
		// resetButton.addEventListener('click', event => {
		// 	event.preventDefault()
		// 	resetButton.disabled = true

		// 	this.#device.reset()
		// 		.then(async () => {
		// 			resetButton.disabled = false
		// 			console.log('reset finished')

		// 			const resetConfig = await this.#device.getConfiguration()

		// 			console.log({ resetConfig })

		// 			modeElem.value = resetConfig.operationMode
		// 			// intctModeElem
		// 			// faultElem
		// 			// resElem

		// 		})
		// 		.catch(e => console.warn(e))
		// })
		// controlsElem.appendChild(resetButton)

		// const pollButton = document.createElement('button')
		// pollButton.innerText = 'poll 💈'
		// pollButton.addEventListener('click', event => {

		// 	Promise.resolve()
		// 		.then(async () => {
		// 			const status = await this.#device.getStatus()
		// 			const temp = await this.#device.getTemperature()

		// 			console.log({ status, temp })
		// 		})
		// 		.catch(e => console.warn(e))
		// })
		// controlsElem.appendChild(pollButton)


		// root.appendChild(controlsElem)


		const tabButtons = root.querySelectorAll('button[data-tab]')
		for (const tabButton of tabButtons) {
			tabButton.addEventListener('click', event => {
				event.preventDefault()

				const { target } = event
				const parent = target?.parentNode
				const grandParent = parent.parentNode

				const tabName = target.getAttribute('data-tab')

				// remove content active
				const activeOthers = grandParent.querySelectorAll(':scope > [data-active]')
				activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

				// remove tab button active
				const activeOthersTabsButtons = parent.querySelectorAll(':scope > button[data-tab]')
				activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

				const tabContentElem = grandParent.querySelector(`:scope > [data-for-tab="${tabName}"]`)
				if(tabContentElem === null) { console.warn('tab content not found', tabName) }
				else {
					tabContentElem.toggleAttribute('data-active', true)
				}

				tabButton.toggleAttribute('data-active', true)
			})
		}


		await refreshConfig()
		await refreshSetPoints()

		return root
	}
}

