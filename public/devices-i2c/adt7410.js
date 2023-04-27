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
		const status = await this.#device.getStatus()
		const config = await this.#device.getConfiguration()
		const temp = await this.#device.getTemperature()
		const setpointH = await this.#device.getSetpointHigh()
		const setpointL = await this.#device.getSetpointLow()
		const setpointC = await this.#device.getSetpointCritical()
		const setpointHyst = await this.#device.getSetpointHysteria()

		console.log({
			id,
			status,
			config,
			temp,
			setpoints: {
			  high: setpointH,
			  low: setpointL,
			  critical: setpointC,
			  hysteria: setpointHyst
			}
		})

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

		const currentConfig = await this.#device.getConfiguration()

		const setpoint = {
			high: 3,
			low: 2,
			critical: 5,
			hysteria: 2
		}

		const root = document.createElement('adt7410-config')

		const configForm = document.createElement('form')
		const setpointForm = document.createElement('form')

		const modeElem = appendSelect(configForm, 'Mode', currentConfig.operationMode, [
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

		const intctModeElem = appendSelect(configForm, 'INT/CT Mode', currentConfig.INTCTMode, [
			{
				value: INT_CT_MODE.INTERRUPT,
				label: 'Interrupt'
			},
			{
				value: INT_CT_MODE.COMPARATOR,
				label: 'Comparator'
			}
		])

    const faultElem = appendSelect(configForm, 'Fault Queue Length', currentConfig.faultQueue, [
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

    const resElem = appendSelect(configForm, 'Resolution', currentConfig.resolution, [
			{
				value: RESOLUTION.THIRTEEN,
				label: '13-bit - 0.0625°C'
			},
			{
				value: RESOLUTION.SIXTEEN,
				label: '16-bit - 0.0078°C'
			}
		])

		const spHighElem = appendInputNumber(setpointForm, 'High', setpoint.high, 0, 100, 1/128)
		const spLowElem = appendInputNumber(setpointForm, 'Low', setpoint.low, 0, 100, 1/128)
		const spCritElem = appendInputNumber(setpointForm, 'Critical', setpoint.critical, 0, 100, 1/128)
		const spHystElem = appendInputNumber(setpointForm, 'Hysteria', setpoint.hysteria, 0, 15, 1)

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

