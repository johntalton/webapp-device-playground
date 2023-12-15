import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { PCF8523, BASE_CENTURY_Y2K } from '@johntalton/pcf8523'

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
		const root = document.createElement('div')
		root.toggleAttribute('data-pcf8523', true)

		const page = `
			<details>
				<summary>Control (1) Settings</summary>

				<form method="dialog">
					<label>Capacitor Selection</label>
					<select disabled>
						<option>7 pF</option>
					</select>

					<label>Status</label>
					<output>Running</output>

					<label>Mode</label>
					<select disabled>
						<option>12 hour mode (AM/PM)</option>
						<option>24 hour mode</option>
					</select>

					<label>Second Interrupt Enabled</label>
					<input type="checkbox" disabled checked></input>

					<label>Alarm Interrupt Enabled</label>
					<input type="checkbox" disabled></input>

					<label>Correction Interrupt Enabled</label>
					<input type="checkbox" disabled></input>

					<button data-refresh-control1>refresh</button>
					<button disabled>save</button>
				</form>
			</details>

			<details>
				<summary>Control (2) Settings</summary>

				<form method="dialog">
					<label>Watchdog Timer A Interrupt</label>
					<output>true</output>

					<label>Countdown Timer A Interrupt</label>
					<output>false</output>

					<label>Countdown Timer B Interrupt</label>
					<output>false</output>

					<label>Second Interrupt</label>
					<output>false</output>

					<label>Alarm Interrupt</label>
					<output>false</output>


					<label>Watchdog Timer A Interrupt Enabled</label>
					<input type="checkbox" disabled checked></input>

					<label>Countdown Timer A Interrupt Enabled</label>
					<input type="checkbox" disabled checked></input>

					<label>Countdown Timer B Interrupt Enabled</label>
					<input type="checkbox" disabled checked></input>

					<button data-refresh-control2>refresh</button>
					<button disabled>save</button>
				</form>
			</details>

			<details>
				<summary>Control (3) Settings</summary>

				<form method="dialog">
					<label>Power Mode</label>
					<output>
						battery switch-over function is enabled in standard mode;
						battery low detection function is enabled
					</output>

					<label>Battery Switchover Interrupt</label>
					<output>false</output>

					<label>Battery Status Low Interrupt</label>
					<output>false</output>

					<label>Battery Switchover Interrupt Enabled</label>
					<input type="checkbox" disabled></input>

					<label>Battery Status Low Interrupt Enabled</label>
					<input type="checkbox" disabled></input>

					<button data-refresh-control3>refresh</button>
					<button disable3d>save</button>
				</form>
			</details>

			<details>
				<summary>Offset Settings</summary>

				<form method="dialog">
					<button>refresh</button>
					<button disabled>save</button>
				</form>
			</details>

			<details>
				<summary>Alarm Settings</summary>

				<form method="dialog">
					<button>refresh</button>
					<button disabled>save</button>
				</form>
			</details>

			<details>
				<summary>Timer Settings</summary>

				<form method="dialog">
					<button>refresh</button>
					<button disabled>save</button>
				</form>
			</details>

			<details>
				<summary>Utilities</summary>

				<form method="dialog">
					<button data-poll-time>⏱️ Poll Time</button>
					<button data-reset>⚡️ Reset</button>
					<button>Stop Oscillator</button>
					<button data-set-time-now>Set Time Now</button>
					<button data-on-battery-mode>Enable Battery and Monitor</button>
				</form>
			</details>

			<form method="dialog">
				<output data-display-integrity></output>
				<output data-display-time></output>
			</form>
		`

		const pageDOM = (new DOMParser).parseFromString(page, 'text/html')
		root.append(...pageDOM.body.children)

		const century = BASE_CENTURY_Y2K



		const refresh1Button = root.querySelector('button[data-refresh-control1]')
		refresh1Button.addEventListener('click', event => {
			this.#device.getControl1().then(ctrl => {
				console.log(ctrl)
			})
		})

		const refresh2Button = root.querySelector('button[data-refresh-control2]')
		refresh2Button.addEventListener('click', event => {
			this.#device.getControl2().then(ctrl => {
				console.log(ctrl)
			})
		})

		const refresh3Button = root.querySelector('button[data-refresh-control3]')
		refresh3Button.addEventListener('click', event => {
			this.#device.getControl3().then(ctrl => {
				console.log(ctrl)
			})
		})

		const batteryModeButton = root.querySelector('button[data-on-battery-mode]')
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

		const setTimeNowButton = root.querySelector('button[data-set-time-now]')
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

		const resetButton = root.querySelector('button[data-reset]')
		resetButton.addEventListener('click', event => {
			this.#device.softReset()
				.catch(e => console.warn(e))
		})

		const pollTimeButton = root.querySelector('button[data-poll-time]')
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

			const outputIntegrity = root.querySelector('output[data-display-integrity]')
			outputIntegrity.value = time.integrity ? '👍' : '👎'

			const outputTime = root.querySelector('output[data-display-time]')
			outputTime.value = date.toString() // date.toLocaleString('en-US')

		})

		return root
	}
}

