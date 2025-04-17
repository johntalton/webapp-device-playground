
import { Tca9548a } from '@johntalton/tca9548a'
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { I2CBusTCA9538A } from '@johntalton/i2c-bus-tca9548a'

import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'
import { bindTabRoot } from '../util/tabs.js'
import { deviceGuessByAddress } from './guesses.js'
import { appendDeviceListItem } from '../util/device-list.js'

export class TCA9548Builder {
	#ui
	#bus
	#abus
	#device

	static async builder(definition, ui) {
		return new TCA9548Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#ui = ui
		this.#bus = bus
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'TCA9548A Multiplexer' }

	async open() {
		this.#device = await Tca9548a.from(this.#abus, {})
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/tca9548.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('tca9548-config')
		if (root === null) { throw new Error('no root for template') }

		const allChannelInputs = root.querySelectorAll('input[name ^= "ch"]')

		const refresh = async () => {
			// allChannelInputs.forEach(i => i.disabled = true)

			const channels = await this.#device.getChannels()

			allChannelInputs.forEach(i => i.checked = false)
			channels.forEach(ch => {
				const chElem = root.querySelector(`input[name="ch${ch}"]`)
				chElem.checked = true
			})

			allChannelInputs.forEach(i => i.disabled = false)
		}

		root.addEventListener('change', asyncEvent(async e => {
			const channels = [ ...range(0, 7) ].map(ch => {
				const chElem = root.querySelector(`input[name="ch${ch}"]`)
				return chElem.checked ? ch : undefined
			}).filter(ch => ch !== undefined)

			await this.#device.setChannels(channels)

			await refresh()
		}))

		const scanButton = root.querySelector('button[data-scan]')
		const deviceList = root.querySelector('[data-device-list]')
		const addressElem = root.querySelector('addr-display[name="scanResults"]')

		scanButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			scanButton.disabled = true

			const existingHexs = addressElem.querySelectorAll('hex-display')
			existingHexs.forEach(eh => eh.remove())

			const existingLis = root.querySelectorAll('li')
			existingLis.forEach(el => el.remove())


			try {
				const ackedList = await this.#bus.scan()

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

						const strategy = {
							exclusive: 3
						}

						//
						item.button.disabled = true
						const deviceGuess = item.select.value

						const controller = new AbortController()
						const { signal } = controller

						this.#ui.addI2CDevice({
							type: deviceGuess,
							bus: I2CBusTCA9538A.from(this.#bus, this.#device, strategy),
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


		bindTabRoot(root)

		await refresh()

		return root
	}
}
