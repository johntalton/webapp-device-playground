import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS3231 } from '@johntalton/ds3231'

export class DS3231Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS3231Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'DS3231 (RTC)' }

	async open() {
		this.#device = await DS3231.from(this.#abus)
	}

	async close() { }

	signature() { }


	async buildCustomView(selectionElem) {
		const VIEW = `
			<ds3231-config>
				<form>
					<button data-set-time>Set Now</button>
					<button data-trigger-temperature>Trigger Temperature Conversion</button>
					<button data-refresh>Refresh</button>
					<button data-clear-all-flags>Clear Flags</button>
				</form>
				<form>
					<label>Temperature</label>
					<output data-temperature></output>

					<label>Time</label>
					<output data-time></output>

					<label>Oscillator Stopped</label>
					<output data-oscillator-stopped-flag></output>

					<label>Busy</label>
					<output data-busy-flag></output>

					<label>Alarm1</label>
					<output data-alarm1-flag></output>

					<label>Alarm2</label>
					<output data-alarm2-flag></output>
				</form>
				<form>
					<label>Alarm1</label>
					<input name="enableAlarm1" type="checkbox" />

					<label>Alarm2</label>
					<input name="enableAlarm2" type="checkbox" />

					<label>Square Wave</label>
					<input name="enableSquareWave" type="checkbox" />

					<label>Square Wave Frequency</label>
					<select name="squareWaveFrequency" disabled>
						<option value="1">1</option>
						<option value="1.024">1.024</option>
						<option value="4.096">4.096</option>
						<option value="8.192">8.192</option>
					</select>

					<fieldset>
						<legend>Battery Backup</legend>

						<label>Oscillator</label>
						<input name="enableBatteryOscillator" type="checkbox" />

						<label>Square Wave</label>
						<input name="enableBatterySquareWave" type="checkbox" />
					</fieldset>
				</form>
			</ds3231-config>
		`
		const node = (new DOMParser()).parseFromString(VIEW, 'text/html')

		const root = node.body.firstChild

		const century = 2000

		function refreshView(root, temp, time, control, status) {
			// temperature
			const temperatureOutput = root.querySelector('[data-temperature]')
			temperatureOutput.value = `${temp.temperatureC} ℃`

			// time
			const { year, month, date, hours, minutes, seconds } = time
			const storedDate = new Date(Date.UTC(
				century + year,
				month - 1,
				date,
				hours, minutes, seconds))

			const timeOutput = root.querySelector('[data-time]')
			timeOutput.value = storedDate

			// control
			const {
				alarm1Enabled,
				alarm2Enabled,
				convertTemperatureEnabled,
				squareWaveEnabled,
				batteryBackupOscillatorEnabled,
				batteryBackupSquareWaveEnabled,
				squareWaveFrequencyKHz
			} = control

			const alarm1Input = root.querySelector('input[name="enableAlarm1"]')
			const alarm2Input = root.querySelector('input[name="enableAlarm2"]')
			const enableSquareWaveInput = root.querySelector('input[name="enableSquareWave"]')

			const enableBatteryOscillatorInput = root.querySelector('input[name="enableBatteryOscillator"]')
			const enableBatterySquareWaveInput = root.querySelector('input[name="enableBatterySquareWave"]')

			alarm1Input.checked = alarm1Enabled
			alarm2Input.checked = alarm2Enabled
			enableSquareWaveInput.checked = squareWaveEnabled
			enableBatteryOscillatorInput.checked = batteryBackupOscillatorEnabled
			enableBatterySquareWaveInput.checked = batteryBackupSquareWaveEnabled

			// status
			const {
				alarm1Flag,
				alarm2Flag,
				busyFlag,
				oscillatorStoppedFlag,
				output32kHzEnabled
			} = status

			const alarm1Output = root.querySelector('[data-alarm1-flag]')
			alarm1Output.value = alarm1Flag ? '🔔' : '🔕'

			const alarm2Output = root.querySelector('[data-alarm2-flag]')
			alarm2Output.value = alarm2Flag ?  '🔔' : '🔕'

			const busyOutput = root.querySelector('[data-busy-flag]')
			busyOutput.value = busyFlag ? '⌛️ (true)' : '(false)'

			const oscillatorStoppedOutput = root.querySelector('[data-oscillator-stopped-flag]')
			oscillatorStoppedOutput.value = oscillatorStoppedFlag ? '🛑 (true)' : '(false)'
		}

		const setTimeButton = root.querySelector('[data-set-time]')
		setTimeButton.addEventListener('click', async event => {
			setTimeButton.disabled = true

			const now = new Date(Date.now())

			const seconds = now.getUTCSeconds()
			const minutes = now.getUTCMinutes()
			const hours = now.getUTCHours()

			const date = now.getUTCDate()
			const month = now.getUTCMonth() + 1
			const year = now.getUTCFullYear() - century

			// await this.#device.setStatus({ clearOscillatorStoppedFlag: true })
			await this.#device.setTime({
				seconds, minutes, hours, date, month, year
			})
			// await this.#device.setStatus({ oscillatorEnabled: true })

			const ctrl = await this.#device.getControl()
			const time = await this.#device.getTime()
			const status = await this.#device.getStatus()
			const temp = await this.#device.getTemperature()

			refreshView(root, temp, time, ctrl, status)

			setTimeButton.disabled = false
		})

		const refreshButton = root.querySelector('[data-refresh]')
		refreshButton.addEventListener('click', async event => {
			event.preventDefault()
			refreshButton.disabled = true

			const ctrl = await this.#device.getControl()
			const time = await this.#device.getTime()
			const status = await this.#device.getStatus()
			const temp = await this.#device.getTemperature()

			refreshView(root, temp, time, ctrl, status)
			refreshButton.disabled = false
		})

		const clearButton = root.querySelector('[data-clear-all-flags]')
		clearButton.addEventListener('click', async event => {
			event.preventDefault()
			clearButton.disabled = true

			await this.#device.setStatus({
				clearOscillatorStoppedFlag: true,
				clearAlarm1: true,
				clearAlarm2: true
			})

			const ctrl = await this.#device.getControl()
			const time = await this.#device.getTime()
			const status = await this.#device.getStatus()
			const temp = await this.#device.getTemperature()

			refreshView(root, temp, time, ctrl, status)
			clearButton.disabled = false
		})

		const ctrl = await this.#device.getControl()
		const time = await this.#device.getTime()
		const status = await this.#device.getStatus()
		const temp = await this.#device.getTemperature()

		refreshView(root, temp, time, ctrl, status)
		return root
	}
}
