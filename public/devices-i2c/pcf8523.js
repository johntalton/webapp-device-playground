import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { PCF8523, BASE_CENTURY_Y2K } from '@johntalton/pcf8523'

import { PCF8523ConfigElement } from '../custom-elements/pcf8523-config.js'

export class PCF8523Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new PCF8523Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'PCF8523 (RTC)' }

	async open() {
		this.#device = await PCF8523.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const preRoot = document.createElement('pcf8523-config')
		preRoot.toggleAttribute('data-pcf8523', true)

		// background task // TODO is there a case for a fallback if never defined?
		customElements.whenDefined('pcf8523-config')
		// Promise.resolve()
			.then(() => {
				const { content } = PCF8523ConfigElement.template
				const view = content.cloneNode(true)
				preRoot.append(view)

				const century = BASE_CENTURY_Y2K

				const startOscillator = preRoot.querySelector('button[data-toggle-oscillator--start]')
				startOscillator.addEventListener('click', event => {
					console.warn('transaction implied not explicit') // / TODO use .transaction
					this.#device.getControl1().then(async ctrl => {
						return this.#device.setControl1({
							...ctrl,
							STOP: false
						})
					})
						.catch(e => console.warn(e))
				})

				const stopOscillator = preRoot.querySelector('button[data-toggle-oscillator--stop]')
				stopOscillator.addEventListener('click', event => {
					console.warn('transaction implied not explicit') // / TODO use .transaction
					this.#device.getControl1().then(async ctrl => {
						return this.#device.setControl1({
							...ctrl,
							STOP: true
						})
					})
						.catch(e => console.warn(e))
				})


				const refresh1Button = preRoot.querySelector('button[data-refresh-control1]')
				refresh1Button.addEventListener('click', event => {
					this.#device.getControl1().then(ctrl => {
						console.log(ctrl)
					})
				})

				const refresh2Button = preRoot.querySelector('button[data-refresh-control2]')
				refresh2Button.addEventListener('click', event => {
					this.#device.getControl2().then(ctrl => {
						console.log(ctrl)
					})
				})

				const refresh3Button = preRoot.querySelector('button[data-refresh-control3]')
				refresh3Button.addEventListener('click', event => {
					this.#device.getControl3().then(ctrl => {
						console.log(ctrl)

						const batteryLowFlag = preRoot.querySelector('output[data-battery-low-flag]')
						const batterySwitchoverFlag = preRoot.querySelector('output[data-battery-switchover-flag]')

						batteryLowFlag.value = ctrl.BATTERY_STATUS_LOW ? '⚠️🔔' : '🔕'
						batterySwitchoverFlag.value = ctrl.BATTERY_SWITCHOVER_FLAG ? '⚠️🔔' : '🔕'

						const switchoverEnabled = preRoot.querySelector('input[data-switchover-enable]')
						const statusLowEnabled = preRoot.querySelector('input[data-status-low-enable]')

						switchoverEnabled.checked = ctrl.BATTERY_SWITCHOVER_INTERRUPT_ENABLED
						statusLowEnabled.checked = ctrl.BATTER_STATUS_LOW_INTERRUPT_ENABLED
					})
				})

				const batteryModeButton = preRoot.querySelector('button[data-on-battery-mode]')
				batteryModeButton.addEventListener('click', event => {
					Promise.resolve()
						.then(async () => {
							await this.#device.setControl3({
								pmBatteryLowDetectionEnabled: true,
								pmSwitchoverEnabled: true,
								pmDirectSwitchingEnabled: false,

								clearBatterSwitchoverFlag: false,
								switchoverEnabled: true,
								batteryLowEnabled: true
							})
						})
						.catch(e => console.warn(e))
				})

				const setTimeNowButton = preRoot.querySelector('button[data-set-time-now]')
				setTimeNowButton.addEventListener('click', event => {
					Promise.resolve()
						.then(async () => {
							const now = new Date(Date.now())

							const seconds = now.getUTCSeconds()
							const minutes = now.getUTCMinutes()
							const hours = now.getUTCHours()

							const day = now.getUTCDate()
							const month = now.getUTCMonth() + 1
							const year = now.getUTCFullYear() - century

							await this.#device.setTime(
								seconds, minutes, hours,
								day, month, year,
								false, century
							)
						})
						.catch(e => console.warn(e))
				})

				const resetButton = preRoot.querySelector('button[data-reset]')
				resetButton.addEventListener('click', event => {
					this.#device.softReset()
						.catch(e => console.warn(e))
				})

				const pollTimeButton = preRoot.querySelector('button[data-poll-time]')
				pollTimeButton.addEventListener('click', async event => {
					const time = await this.#device.getTime(false, century)

					const { year, month, monthsValue, day, hour, minute, second, weekday } = time

					//
					const date = new Date(Date.UTC(
						year,
						monthsValue - 1,
						day,
						hour, minute, second))

					console.log(time.integrity ? '👍' : '👎', date)

					const outputIntegrity = preRoot.querySelector('output[data-display-integrity]')
					outputIntegrity.value = time.integrity ? '👍' : '👎'

					const outputTime = preRoot.querySelector('output[data-display-time]')
					outputTime.value = date.toString() // date.toLocaleString('en-US')

				})
			})
			.catch(e => console.warn(e))

		return preRoot
	}
}

