import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS3502 } from '@johntalton/ds3502'

import { Waves } from '../util/wave.js'
import { delayMs} from '../util/delay.js'

async function potScript(device, options) {
	await device.setControl({ persist: false})
	for await (const value of Waves.sin(options)) {
		await delayMs(100)
		await device.setWiper(value)
	}
}


export class DS3502Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS3502Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'DS3502 Digital Potentiometer' }


	async open() {
		this.#device = await DS3502.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/ds3502.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ds3502-config')
		if (root === null) { throw new Error('no root for template') }

		//
		const valueForm = root.querySelector('form[data-value]')
		const wiperRange = valueForm?.querySelector('input[name="wiperValueRange"]')
		const wiperNumber = valueForm?.querySelector('input[name="wiperValueNumber"]')
		const persistCheckbox = valueForm?.querySelector('input[name="persist"]')

		const toggleSinButton = root.querySelector('button[data-script="wave"]')

		const refresh = async () => {
			await delayMs(100)

			const { persist } = await this.#device.getControl()
			const value = await this.#device.getWiper()

			console.log({ persist, value })

			wiperNumber.value = value
			wiperRange.value = value

			persistCheckbox.checked = persist
		}

		//
		valueForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			const whatChanged = event.target.getAttribute('name')

			if(whatChanged === 'wiperValueNumber') {
				wiperRange.value = wiperNumber.value
				await this.#device.setWiper(parseInt(wiperNumber.value))
			}
			else if(whatChanged === 'wiperValueRange') {
				wiperNumber.value = wiperRange.value
				await this.#device.setWiper(parseInt(wiperRange.value))
			}
			else if(whatChanged === 'persist') {
				persistCheckbox.disabled = true
				await this.#device.setControl({ persist: persistCheckbox.checked })
			}

			await refresh()

			persistCheckbox.disabled = false
		}))


		let controller = undefined
		toggleSinButton.textContent = 'Wave 🌊'
		toggleSinButton.addEventListener('click', e => {
			e.preventDefault()

			if(controller === undefined) {
				controller = new AbortController()
				const { signal } = controller

				toggleSinButton.textContent = 'Wave 🛑'

				Promise.resolve(delayMs(1))
					.then(() => potScript(this.#device, { periodMs: 10 * 1000, signal }))
					.then(() => {
						console.log('script has ended')
						toggleSinButton.textContent = 'Wave 🌊'
						toggleSinButton.disabled = false
					})
					.catch(console.warn)
			}
			else {
				controller.abort('user click stop')
				toggleSinButton.disabled = true
				controller = undefined
			}
		}, { once: false })







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

		await refresh()

		return root
	}
}