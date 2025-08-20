import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { AHT20 } from '@johntalton/aht20'

import { asyncEvent } from '../util/async-event.js'

export class AHT20Builder {
	#abus
	#device

	static async builder(definition, ui) { return new AHT20Builder(definition, ui) }

	constructor(definition, ui) {
		const { bus, address } = definition
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'AHT20' }

	async open() { this.#device = AHT20.from(this.#abus) }

	async close() {
		console.log('Builder Close')
	}

	signature() { }

	async buildCustomView() {
		const response = await fetch('./custom-elements/aht20.html')
		if(!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('aht20-config')
		if(root === null) { throw new Error('no root for template')}

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

		buttonReset?.addEventListener('click', asyncEvent(async e => {
			await this.#device.reset()
		}))

		buttonState?.addEventListener('click', asyncEvent(async e => {
			const state = await this.#device.getState()

			outInit.innerText = state.initialized ? '👍' : '👎'
			outReady.innerText = state.busy ? '👎' : '👍'
			outCali.innerText = state.calibrated ? '👍' : '👎'
		}))

		buttonInit?.addEventListener('click', asyncEvent(async e => {
			await this.#device.initialize()
		}))

		buttonTrigger?.addEventListener('click', asyncEvent(async e => {
			await this.#device.triggerMeasurement()
		}))

		buttonMeasurement?.addEventListener('click', asyncEvent(async e => {
			const result = await this.#device.getMeasurement()

			if(true) {
				outInit.innerText = result.initialized ? '(👍)' : '(👎)'
				outReady.innerText = result.busy ? '(👎)' : '(👍)'
				outCali.innerText = result.calibrated ? '(👍)' : '(👎)'
			}

			outHumi.innerText = Math.trunc(result.humidityRH * 100) / 100
			outTemp.innerText = Math.trunc(result.temperatureC * 100) / 100
			outCRC.innerText = result.validCRC ? '👍' : '👎'
		}))

		return root
	}
}