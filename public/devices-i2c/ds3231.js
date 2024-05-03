import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS3231 } from '@johntalton/ds3231'

export class DS3231Builder {
	#abus

	/** @type {DS3231} */
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
		// fetch template
		const response = await fetch('./custom-elements/ds3231.html')
		if(!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ds3231-config')
		if(root === null) { throw new Error('no root for template')}

		const century = 2000

		async function refreshView(root, device) {
			const ctrl = await device.getControl()
			const time = await device.getTime()
			const status = await device.getStatus()
			const temp = await device.getTemperature()
			const alarm1 = await device.getAlarm1()
			const alarm2 = await device.getAlarm1()

			_refreshView(root, temp, time, ctrl, status, alarm1, alarm2)
		}

		function _refreshView(root, temp, time, control, status, alarm1, alarm2) {
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

			// alarm 1
			console.log(alarm1)

			// alarm 2
			console.log(alarm2)

		}

		const setTimeButton = root.querySelector('[data-set-time]')
		setTimeButton?.addEventListener('click', async event => {
			event.preventDefault()

			const now = new Date(Date.now())

			const seconds = now.getUTCSeconds()
			const minutes = now.getUTCMinutes()
			const hours = now.getUTCHours()

			const date = now.getUTCDate()
			const month = now.getUTCMonth() + 1
			const year = now.getUTCFullYear() - century

			//await this.#device.setStatus({ clearOscillatorStoppedFlag: true })
			await this.#device.setTime({
				seconds, minutes, hours, date, month, year
			})

			await refreshView(root, this.#device)
		})

		const refreshButton = root.querySelector('[data-refresh]')
		refreshButton?.addEventListener('click', async event => {
			event.preventDefault()

			await refreshView(root, this.#device)
		})

		const clearButton = root.querySelector('[data-clear-all-flags]')
		clearButton?.addEventListener('click', async event => {
			event.preventDefault()

			await this.#device.setStatus({
				clearOscillatorStoppedFlag: true,
				clearAlarm1: true,
				clearAlarm2: true
			})

			await refreshView(root, this.#device)
		})

		const controlForm = root.querySelector('form[data-control]')
		controlForm?.addEventListener('change', async event => {
			event.preventDefault()

			const alarm1Checkbox = root.querySelector('input[name="enableAlarm1"]')
			const alarm2Checkbox = root.querySelector('input[name="enableAlarm2"]')

			const batteryOscillatorCheckbox = root.querySelector('input[name="enableBatteryOscillator"]')

			alarm1Checkbox.disabled = true
			alarm2Checkbox.disabled = true
			batteryOscillatorCheckbox.disabled = true

			const enableAlarm1 = alarm1Checkbox.checked
			const enableAlarm2 = alarm2Checkbox.checked
			const enableOscillatorOnBatteryBackup = batteryOscillatorCheckbox.checked

			await this.#device.setControl({
				enableAlarm1,
				enableAlarm2,
				enableOscillatorOnBatteryBackup
			})

			await refreshView(root, this.#device)

			alarm1Checkbox.disabled = false
			alarm2Checkbox.disabled = false
			batteryOscillatorCheckbox.disabled = false
		})

		const tabButtons = root.querySelectorAll('button[data-tab]')
		for(const tabButton of tabButtons) {
			tabButton.addEventListener('click', event => {
				event.preventDefault()

				const { target} = event
				const parent = target?.parentNode.parentNode

				const tabName = target.getAttribute('data-tab')

				// remove content active
				const activeOthers = parent.querySelectorAll('[data-active]')
				activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

				// remove tab button active
				const activeOthersTabsButtons = parent.querySelectorAll('button[data-tab]')
				activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

				const tabContentElem = parent.querySelector(`[data-for-tab="${tabName}"]`)
				tabContentElem.toggleAttribute('data-active', true)

				tabButton.toggleAttribute('data-active', true)
			})
		}

		await refreshView(root, this.#device)

		return root
	}
}
