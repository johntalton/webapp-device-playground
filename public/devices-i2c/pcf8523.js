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
			.then(() => {
				const { content } = PCF8523ConfigElement.template
				const view = content.cloneNode(true)
				preRoot.append(view)

				const century = BASE_CENTURY_Y2K

				const startOscillator = preRoot.querySelector('button[data-toggle-oscillator--start]')
				startOscillator.addEventListener('click', event => {
					console.warn('transaction implied not explicit') // / TODO use .transaction
					this.#device.getControl1()
						.then(async ctrl => {
							return this.#device.setControl1({
								...ctrl,
								stop: false
							})
						})
						.catch(e => console.warn(e))
				})

				const stopOscillator = preRoot.querySelector('button[data-toggle-oscillator--stop]')
				stopOscillator.addEventListener('click', event => {
					console.warn('transaction implied not explicit') // / TODO use .transaction
					this.#device.getControl1()
						.then(async ctrl => {
							return this.#device.setControl1({
								...ctrl,
								stop: true
							})
						})
						.catch(e => console.warn(e))
				})

				const capSelElem = preRoot.querySelector('select[data-capacitor-selection]')
				const stopElem = preRoot.querySelector('output[data-stop]')
				const ampmElem = preRoot.querySelector('select[data-ampm]')
				const secondEnabled = preRoot.querySelector('input[data-second-interrupt-enabled]')
				const alarmEnabled = preRoot.querySelector('input[data-alarm-interrupt-enabled]')
				const correctionEnabled = preRoot.querySelector('input[data-correction-interrupt-enabled]')

				const saveControl1Elem = preRoot.querySelector('button[data-save-control1]')
				saveControl1Elem.disabled = false

				function UIUpdateControl1(profile) {
					const {
						capacitorSelection, stop, ampm,
						secondInterruptEnabled,
						alarmInterruptEnabled,
						correctionInterruptEnabled
					} = profile

					capSelElem.value = capacitorSelection
					stopElem.value = stop ? 'Stopped' : 'Running'
					ampmElem.value = ampm ? '12' : '24'

					secondEnabled.checked = secondInterruptEnabled
					alarmEnabled.checked = alarmInterruptEnabled
					correctionEnabled.checked = correctionInterruptEnabled
				}

				const formControl1 = preRoot.querySelector('form[data-control1-form]')
				formControl1.addEventListener('submit', event => {
					// const { target: form, submitter  } = event
					// const data = new FormData(form, submitter)
					// for (const [key, value] of data) {
					// 	console.log(key, value)
					// }

					Promise.resolve()
						.then(async () => {

							await this.#device.setControl1({
								capacitorSelection: capSelElem.value,
								stop: false,
								ampm: ampmElem.value === '12',
								secondInterruptEnabled: secondEnabled.checked,
								alarmInterruptEnabled: alarmEnabled.checked,
								correctionInterruptEnabled: correctionEnabled.checked
							})

							const result = await this.#device.getControl1()
							UIUpdateControl1(result)

							saveControl1Elem.disabled = false
						})
						.catch(e => console.warn(e))
				})

				const refresh1Button = preRoot.querySelector('button[data-refresh-control1]')
				refresh1Button.addEventListener('click', event => {
					this.#device.getControl1().then(ctrl => {
						console.log(ctrl)
						UIUpdateControl1(ctrl)
					})
					.catch(e => console.warn(e))
				})


				const watchdogAFlagElem = preRoot.querySelector('output[data-watchdog-flag]')
				const countdownAFlagElem = preRoot.querySelector('output[data-countdownA-flag]')
				const countdownBFlagElem = preRoot.querySelector('output[data-countdownB-flag]')
				const secondFlagElem = preRoot.querySelector('output[data-second-flag]')
				const alarmFlagElem = preRoot.querySelector('output[data-alarm-flag]')

				const watchdogEnabledElem = preRoot.querySelector('input[data-watchdog-enabled]')
				const countdownAEnabledElem = preRoot.querySelector('input[data-countdownA-enabled]')
				const countdownBEnabledElem = preRoot.querySelector('input[data-countdownB-enabled]')

				function UIUpdateControl2(profile) {
					const {
						watchdogAFlag,
						countdownAFlag,
						countdownBFlag,
						secondFlag,
						alarmFlag,

						watchdogAInterruptEnabled,
						countdownAInterruptEnabled,
						countdownBInterruptEnabled
					} = profile

					watchdogAFlagElem.value = watchdogAFlag ? '🔔' : '🔕'
					countdownAFlagElem.value = countdownAFlag ? '🔔' : '🔕'
					countdownBFlagElem.value = countdownBFlag ? '🔔' : '🔕'
					secondFlagElem.value = secondFlag ? '🔔' : '🔕'
					alarmFlagElem.value = alarmFlag ? '🔔' : '🔕'

					watchdogEnabledElem.checked = watchdogAInterruptEnabled
					countdownAEnabledElem.checked = countdownAInterruptEnabled
					countdownBEnabledElem.checked = countdownBInterruptEnabled
				}

				const saveControl2Elem = preRoot.querySelector('button[data-save-control2]')
				saveControl2Elem.disabled = false

				const formControl2 = preRoot.querySelector('form[data-control2-form]')
				formControl2.addEventListener('submit', event => {
					saveControl2Elem.disabled = true
					Promise.resolve()
						.then(async () => {
							await this.#device.setControl2({
								clearCountdownAFlag: false,
								clearCountdownBFlag: false,
								clearSecondFlag: false,
								clearAlarmFlag: false,

								watchdogInterruptEnabled: watchdogEnabledElem.checked,
								countdownAInterruptEnabled: countdownAEnabledElem.checked,
								countdownBInterruptEnabled: countdownBEnabledElem.checked,
							})

							const result = await this.#device.getControl2()
							UIUpdateControl2(result)

							saveControl2Elem.disabled = false
						})
						.catch(e => console.warn(e))
				})

				const refresh2Button = preRoot.querySelector('button[data-refresh-control2]')
				refresh2Button.addEventListener('click', event => {
					this.#device.getControl2().then(ctrl => {
						console.log(ctrl)

						UIUpdateControl2(ctrl)
					})
					.catch(e => console.warn(e))
				})

				const refresh3Button = preRoot.querySelector('button[data-refresh-control3]')
				refresh3Button.addEventListener('click', event => {
					this.#device.getControl3().then(ctrl => {
						console.log(ctrl)

						const batteryLowFlag = preRoot.querySelector('output[data-battery-low-flag]')
						const batterySwitchoverFlag = preRoot.querySelector('output[data-battery-switchover-flag]')

						batteryLowFlag.value = ctrl.batteryLowFlag ? '🔔' : '🔕'
						batterySwitchoverFlag.value = ctrl.batterySwitchoverFlag ? '🔔' : '🔕'

						const switchoverEnabled = preRoot.querySelector('input[data-switchover-enable]')
						const statusLowEnabled = preRoot.querySelector('input[data-status-low-enable]')

						switchoverEnabled.checked = ctrl.batterySwitchoverInterruptEnabled
						statusLowEnabled.checked = ctrl.batteryLowInterruptEnabled
					})
					.catch(e => console.warn(e))
				})

				const refreshTimerButton = preRoot.querySelector('button[data-refresh-timer]')
				refreshTimerButton.addEventListener('click', event => {
					Promise.resolve()
						.then(async () => {
							const result = await this.#device.getTimer()

							console.log(result)
						})
						.catch(e => console.warn(e))

				})



				const batteryModeButton = preRoot.querySelector('button[data-on-battery-mode]')
				batteryModeButton.addEventListener('click', event => {
					Promise.resolve()
						.then(async () => {
							await this.#device.setControl3({
								pmBatteryLowDetectionEnabled: true,
								pmSwitchoverEnabled: true,
								pmDirectSwitchingEnabled: false,

								clearBatterSwitchoverFlag: true,

								batterySwitchoverInterruptEnabled: true,
								batteryLowInterruptEnabled: true,
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
				pollTimeButton.addEventListener('click', event => {
					Promise.resolve()
						.then(async () => {
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
						.catch(e => console.warn(e))
				})
			})
			.catch(e => console.warn(e))

		return preRoot
	}
}

