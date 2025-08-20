import { I2CBusWeb } from '@johntalton/i2c-bus-service/client'

import { deviceGuessByAddress } from '../devices-i2c/guesses.js'
import { asyncEvent } from '../util/async-event.js'
import { appendDeviceListItem } from '../util/device-list.js'

export class WebServiceBuilder {
	#ui

	static async builder(definition, ui) { return new WebServiceBuilder(definition, ui) }

	constructor(definition, ui) {
		this.#ui = ui
	}

	get title() { return 'Web I²C Bus' }

	async open() {}

	async close() {}

	signature() {}

	async buildCustomView() {
		const response = await fetch('./custom-elements/web.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('web-config')
		if (root === null) { throw new Error('no root for template') }

		//
		const urlText = root.querySelector('input[name="url"]')
		const scanButton = root.querySelector('button[data-scan]')
		const deviceList = root.querySelector('[data-device-list]')
		const addressElem = root.querySelector('addr-display[name="scanResults"]')


		scanButton?.addEventListener('click', asyncEvent(async event => {
			scanButton.disabled = true

			const bus = new I2CBusWeb(urlText.value)

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())


			try {
				const ackedList = await bus.scan()


				ackedList.forEach(addr => {
					const acked = true


					const hexElem = document.createElement('hex-display')

					hexElem.setAttribute('slot', addr)

					hexElem.toggleAttribute('acked', true)
					// hexElem.toggleAttribute('arbitration', arbitration)
					// hexElem.toggleAttribute('timedout', timedout)

					hexElem.textContent = addr.toString(16).padStart(2, '0')

					addressElem.append(hexElem)

					//
					const listElem = document.createElement('li')
					listElem.textContent = addr

					listElem.setAttribute('slot', 'vdevice-guess-list')
					listElem.toggleAttribute('data-acked', true)

					const guesses = deviceGuessByAddress(addr)
					const item = appendDeviceListItem(deviceList, addr, { acked, guesses })

					item.button.addEventListener('click', e => {
						e.preventDefault()

						//
						item.button.disabled = true
						const deviceGuess = item.select.value

						const controller = new AbortController()
						const { signal } = controller

						this.#ui.addI2CDevice({
							type: deviceGuess,
							bus,
							address: addr,

							port: undefined,
							signal
						})


					}, { once: true })

				})
			}
			catch(e) {
				console.log(e)
			}

			scanButton.disabled = false
		}))

		return root
	}
}
