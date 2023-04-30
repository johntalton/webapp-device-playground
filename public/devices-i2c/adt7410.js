import { I2CAddressedBus } from '@johntalton/and-other-delights'
// import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import {
	ADT7410,

	OPERATION_MODE,
	FAULT_QUEUE_COUNT,
	RESOLUTION,
	INT_CT_MODE
} from '@johntalton/adt7410'


export class ADT7410Builder {
	#abus
	#device

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

		const id = await this.#device.getId()


	}

	async close() { }

	signature() { }

	async buildCustomView() {
		function appendSelect(root, label, currentValue, options) {
			const elem = document.createElement('select')
			// elem.setAttribute('name', 'mode')
			const elemLabel = document.createElement('label')
			elemLabel.textContent = label

			options.forEach(({ value, label }) => {
				const optionElem = document.createElement('option')
				optionElem.innerText = label
				optionElem.value = value

				if(currentValue === value) {
					optionElem.selected = true
				}

				elem.appendChild(optionElem)
			})

			root.appendChild(elemLabel)
			root.appendChild(elem)

			return elem
		}

		function appendInputNumber(root, label, currentValue, min, max, step) {
			const elem = document.createElement('input')
			// elem.setAttribute('type', 'range')
			elem.setAttribute('type', 'number')
			elem.setAttribute('min', min)
			elem.setAttribute('max', max)
			elem.setAttribute('step', step)

			elem.value = currentValue

			const elemLabel = document.createElement('label')
			elemLabel.textContent = label

			root.appendChild(elemLabel)
			root.appendChild(elem)

			return elem
		}

		// risk async
		const profile = await Promise.all([
			await this.#device.getConfiguration(),
			await this.#device.getSetpointHigh(),
			await this.#device.getSetpointLow(),
			await this.#device.getSetpointCritical(),
			await this.#device.getSetpointHysteria()
		])
		.then(([
			config,
			setpointH,
			setpointL,
			setpointC,
			setpointHyst
		]) => ({
			...config,
			setpoints: {
			  high: setpointH,
			  low: setpointL,
			  critical: setpointC,
			  hysteria: setpointHyst
			}
		}))


		const root = document.createElement('adt7410-config')

		const configForm = document.createElement('form')
		const setpointForm = document.createElement('form')

		const modeElem = appendSelect(configForm, 'Mode', profile.operationMode, [
			{
				value: OPERATION_MODE.CONTINUOUS,
				label: 'Continuous'
			},
			{
				value: OPERATION_MODE.ONE_SHOT,
				label: 'One Shot',
			},
			{
				value: OPERATION_MODE.ONE_SPS,
				label: '1 SPS',
			},
			{
				value: OPERATION_MODE.SHUTDOWN,
				label: 'Shutdown'
			}
		])

		const intctModeElem = appendSelect(configForm, 'INT/CT Mode', profile.INTCTMode, [
			{
				value: INT_CT_MODE.INTERRUPT,
				label: 'Interrupt'
			},
			{
				value: INT_CT_MODE.COMPARATOR,
				label: 'Comparator'
			}
		])

    const faultElem = appendSelect(configForm, 'Fault Queue Length', profile.faultQueue, [
			{
				value: FAULT_QUEUE_COUNT.ONE,
				label: '1 (one)'
			},
			{
				value: FAULT_QUEUE_COUNT.TWO,
				label: '2 (two)'
			},
			{
				value: FAULT_QUEUE_COUNT.THREE,
				label: '3 (three)'
			},
			{
				value: FAULT_QUEUE_COUNT.FOUR,
				label: '4 (four)'
			}
		])

    const resElem = appendSelect(configForm, 'Resolution', profile.resolution, [
			{
				value: RESOLUTION.THIRTEEN,
				label: '13-bit - 0.0625°C'
			},
			{
				value: RESOLUTION.SIXTEEN,
				label: '16-bit - 0.0078°C'
			}
		])

		const fieldsetElem = document.createElement('fieldset')

		const spHighElem = appendInputNumber(fieldsetElem, 'High', profile.setpoints.high, 0, 100, .5) // 1/128
		const spLowElem = appendInputNumber(fieldsetElem, 'Low', profile.setpoints.low, 0, 100, .5)
		const spCritElem = appendInputNumber(fieldsetElem, 'Critical', profile.setpoints.critical, 0, 100, .5)
		const spHystElem = appendInputNumber(fieldsetElem, 'Hysteria', profile.setpoints.hysteria, 0, 15, 1)

		const setSetpointsButton = document.createElement('button')
		setSetpointsButton.innerText = 'Set'

		setpointForm.appendChild(fieldsetElem)
		setpointForm.appendChild(setSetpointsButton)

		setSetpointsButton.addEventListener('click', event => {
			setSetpointsButton.disabled = true

			const spH = spHighElem.value
			const spL = spLowElem.value
			const spC = spCritElem.value
			const spHyst = spHystElem.value

			Promise.resolve()
				.then(() => this.#device.setSetpointHigh(spH))
				.then(() => this.#device.setSetpointLow(spL))
				.then(() => this.#device.setSetpointCritical(spC))
				.then(() => this.#device.setSetpointHysteria(spHyst))
				.then(() => {
					setSetpointsButton.disabled = false
				})
				.catch(e => console.warn(e))
		})

		setpointForm.addEventListener('change', event => {

		})

		configForm.addEventListener('change', event => {
			const operationMode = Number.parseInt(modeElem.value)
			const resolution = Number.parseInt(resElem.value)
			const faultQueue = Number.parseInt(faultElem.value)

			console.log({ operationMode, resolution })

			this.#device.setConfiguration({
				faultQueue,
				CTPolarity: 0,
				INTPolarity: 0,
				INTCTMode: 0,
				operationMode,
				resolution
			})
				.then(async () => {
					// config updated
					console.log('success', await this.#device.getConfiguration())
				})
				.catch(e => console.warn(e))
		})

    root.appendChild(configForm)
		root.appendChild(setpointForm)


		const controlsElem = document.createElement('div')
		controlsElem.toggleAttribute('data-controls', true)

    const resetButton = document.createElement('button')
		resetButton.innerText = 'reset ⚡️'
		resetButton.addEventListener('click', event => {
			event.preventDefault()
			resetButton.disabled = true

			this.#device.reset()
				.then(async () => {
					resetButton.disabled = false
					console.log('reset finished')

					const resetConfig = await this.#device.getConfiguration()

					console.log({ resetConfig })

					modeElem.value = resetConfig.operationMode
					// intctModeElem
					// faultElem
					// resElem

				})
				.catch(e => console.warn(e))
		})
		controlsElem.appendChild(resetButton)

		const pollButton = document.createElement('button')
		pollButton.innerText = 'poll 💈'
		pollButton.addEventListener('click', event => {
		})
		controlsElem.appendChild(pollButton)


		root.appendChild(controlsElem)

		return root
	}
}

