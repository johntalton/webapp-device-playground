
import { PCF8523, BASE_CENTURY_Y2K, decodeTimeToDate, encodeTimeFromDate, timerValueToUnit } from '@johntalton/pcf8523'
import { BasicBuilder } from './builder.js'
import { bindTabRoot } from '../util/tabs.js'
import { asyncEvent } from '../util/async-event.js'

/**
 * @import { Time } from '@johntalton/pcf8523'
 */

/**
 * @template T
 * @param {Element} root
 * @param {string} query
 * @param {new (...args: any[]) => T} type
 * @returns T
 */
function elem(root, query, type) {
	const e = root.querySelector(query)
	if(!(e instanceof type)) { throw new Error('invalid element') }
	return e
}

/**
 * @extends {BasicBuilder<PCF8523>}
 */
export class PCF8523Builder extends BasicBuilder {
	static async builder(definition, ui) {
		return new PCF8523Builder(definition, ui)
	}

	constructor(definition, ui) {
		super('PCF8523 (RTC)', 'pcf8523', PCF8523, definition, ui)
	}

	/**
	 * @param {Element} root
	 */
	async bindCustomView(root) {
		const century = BASE_CENTURY_Y2K
		const ampm_mode = false

		//
		const configTimeOutput = elem(root, 'output[name="CurrentTime"]', HTMLOutputElement)
		const configTimeIntegrityOutput = elem(root, 'output[name="Integrity"]', HTMLOutputElement)
		//
		const capacitorSelectionSelect = elem(root, 'select[name="capacitorSelection"]', HTMLSelectElement)
		const amPmModeCheckbox = elem(root, 'input[name="amPmMode"]', HTMLInputElement)
		const secondInterruptEnabledCheckbox = elem(root, 'input[name="secondInterruptEnabled"]', HTMLInputElement)
		const alarmInterruptEnabledCheckbox = elem(root, 'input[name="alarmInterruptEnabled"]', HTMLInputElement)
		const correctionInterruptEnabledCheckbox = elem(root, 'input[name="correctionInterruptEnabled"]', HTMLInputElement)
		//
		const watchdogFlagOutput = elem(root, 'output[name="WatchdogFlag"]', HTMLOutputElement)
		const countdownAFlagOutput = elem(root, 'output[name="CountdownAFlag"]', HTMLOutputElement)
		const countdownBFlagOutput = elem(root, 'output[name="CountdownBFlag"]', HTMLOutputElement)
		const secondFlagOutput = elem(root, 'output[name="SecondFlag"]', HTMLOutputElement)
		const alarmFlagOutput = elem(root, 'output[name="AlarmFlag"]', HTMLOutputElement)
		const watchdogEnabledCheckbox = elem(root, 'input[name="WatchdogEnabled"]', HTMLInputElement)
		const countdownAEnabledCheckbox = elem(root, 'input[name="CountdownAEnabled"]', HTMLInputElement)
		const countdownBEnabledCheckbox = elem(root, 'input[name="CountdownBEnabled"]', HTMLInputElement)
		//
		const powerModeSwitchoverSelect = elem(root, 'select[name="PowerModeSwitchover"]', HTMLSelectElement)
		const powerModeModeSelect = elem(root, 'select[name="PowerModeMode"]', HTMLSelectElement)
		const powerModeDetectionSelect = elem(root, 'select[name="PowerModeDetection"]', HTMLSelectElement)
		const batterySwitchoverFlagOutput = elem(root, 'output[name="BatterySwitchoverFlag"]', HTMLOutputElement)
		const batteryLowFlagOutput = elem(root, 'output[name="BatteryLowFlag"]', HTMLOutputElement)
		const batterySwitchoverEnabledCheckbox = elem(root, 'input[name="BatterySwitchoverEnabled"]',HTMLInputElement)
		const batteryLowEnabledCheckbox = elem(root, 'input[name="BatteryLowEnabled"]', HTMLInputElement)
		//
		const offsetModeSelect = elem(root, 'select[name="OffsetMode"]', HTMLSelectElement)
		const offsetValueNumber = elem(root, 'input[name="OffsetValue"]', HTMLInputElement)
		const offsetPPMOutput = elem(root, 'output[name="OffsetPPM"]', HTMLOutputElement)
		//
		const alarmEnableMinuteCheckbox = elem(root, '[name="AlarmEnableMinute"]', HTMLInputElement)
		const alarmMinuteNumber = elem(root, '[name="AlarmMinute"]', HTMLInputElement)
		const alarmEnableHourCheckbox = elem(root, '[name="AlarmEnableHour"]', HTMLInputElement)
		const alarmHourNumber = elem(root, '[name="AlarmHour"]', HTMLInputElement)
		const alarmAMPMSelect = elem(root, '[name="AlarmAMPM"]', HTMLSelectElement)
		const alarmEnableDayCheckbox = elem(root, '[name="AlarmEnableDay"]', HTMLInputElement)
		const alarmDayNumber = elem(root, '[name="AlarmDay"]', HTMLInputElement)
		const alarmEnableWeekdayCheckbox = elem(root, '[name="AlarmEnableWeekday"]', HTMLInputElement)
		const alarmWeekdaySelect = elem(root, '[name="AlarmWeekday"]', HTMLSelectElement)
		//
		const timerAInterruptModeSelect = elem(root, 'select[name="TimerAInterruptMode"]', HTMLSelectElement)
		const timerBInterruptModeSelect = elem(root, 'select[name="TimerBInterruptMode"]', HTMLSelectElement)
		const timerClockFrequencySelect = elem(root, 'select[name="TimerClockFrequency"]', HTMLSelectElement)
		const timerAConfigurationSelect = elem(root, 'select[name="TimerAConfiguration"]', HTMLSelectElement)
		const timerBConfigurationSelect = elem(root, 'select[name="TimerBConfiguration"]', HTMLSelectElement)
		//
		const timerASourceClockSelect = elem(root, 'select[name="TimerASourceClock"]', HTMLSelectElement)
		const timerAValueNumber = elem(root, 'input[name="TimerAValue"]', HTMLInputElement)
		const timerAValueUintOutput = elem(root, 'output[name="TimerAValueUnit"]', HTMLOutputElement)
		const timerBSourceClockSelect = elem(root, 'select[name="TimerBSourceClock"]', HTMLSelectElement)
		const timerBPulseWidthSelect = elem(root, 'select[name="TimerBPulseWidth"]', HTMLSelectElement)
		const timerBValueNumber = elem(root, 'input[name="TimerBValue"]', HTMLInputElement)
		const timerBValueUnitOutput = elem(root, 'output[name="TimerBValueUnit"]', HTMLOutputElement)

		//
		const timeAsDefaultOutput = elem(root, 'output[name="TimeAsDefault"]', HTMLOutputElement)
		const timeAsLocalOutput = elem(root, 'output[name="TimeAsLocal"]', HTMLOutputElement)
		const timeAsUTCOutput = elem(root, 'output[name="TimeAsUTC"]', HTMLOutputElement)
		const timeIntegrityOutput = elem(root, 'output[name="TimeIntegrity"]', HTMLOutputElement)
		const timeYearOutput = elem(root, 'output[name="TimeYear"]', HTMLOutputElement)
		const timeMonthOutput = elem(root, 'output[name="TimeMonth"]', HTMLOutputElement)
		const timeDayOutput = elem(root, 'output[name="TimeDay"]', HTMLOutputElement)
		const timeWeekdayOutput = elem(root, 'output[name="TimeWeekday"]', HTMLOutputElement)
		const timeHourOutput = elem(root, 'output[name="TimeHour"]', HTMLOutputElement)
		const timeMinuteOutput = elem(root, 'output[name="TimeMinute"]', HTMLOutputElement)
		const timeSecondOutput = elem(root, 'output[name="TimeSecond"]', HTMLOutputElement)

		const refreshTime_Full = async (/** @type {Time|undefined} */ fromTime = undefined) => {
			const time = fromTime ?? await this.device.getTime()
			const {
				second,
				minute,
				hour,
				day,
				weekdayValue,
				monthsValue,
				year4digit,
				integrity,
				pm,
				weekday,
				month,
			} = time

			const date = decodeTimeToDate(time)

			timeAsDefaultOutput.value = date.toString()
			timeAsLocalOutput.value = date.toLocaleString()
			timeAsUTCOutput.value = date.toUTCString()

			timeIntegrityOutput.value = `${integrity}`
			timeYearOutput.value = `${year4digit}`
			timeMonthOutput.value = `${month} (${monthsValue})`
			timeDayOutput.value = `${day}`
			timeWeekdayOutput.value = `${weekday} (${weekdayValue})`
			timeHourOutput.value = `${hour} (${pm === undefined ? '24-hour' : pm ? 'pm' : 'am'})`
			timeMinuteOutput.value = `${minute}`
			timeSecondOutput.value = `${second}`
		}

		const refreshTime_Config = async (/** @type {Time|undefined} */ fromTime = undefined) => {
			const time = fromTime ?? await this.device.getTime(ampm_mode, century)
			const date = decodeTimeToDate(time)

			configTimeIntegrityOutput.value = time.integrity ? '👍' : '👎'
			configTimeOutput.value = date.toString()//date.toUTCString() //date.toLocaleString('en-US')
		}

		const refreshTime_All = async () => {
			const time = await this.device.getTime()
			await refreshTime_Config(time)
			await refreshTime_Full(time)
		}

		const refreshControl1 = async () => {
			const {
				capacitorSelection,
    		stop,
				ampm,
				secondInterruptEnabled,
				alarmInterruptEnabled,
				correctionInterruptEnabled
			} = await this.device.getControl1()

			capacitorSelectionSelect.value = capacitorSelection
			amPmModeCheckbox.checked = ampm
			secondInterruptEnabledCheckbox.checked = secondInterruptEnabled
			alarmInterruptEnabledCheckbox.checked = alarmInterruptEnabled
			correctionInterruptEnabledCheckbox.checked = correctionInterruptEnabled

			console.log('control1 stop', stop)
		}

		const refreshControl2 = async () => {
			const {
				watchdogAFlag,
				countdownAFlag,
				countdownBFlag,
				secondFlag,
				alarmFlag,

				watchdogAInterruptEnabled,
				countdownAInterruptEnabled,
				countdownBInterruptEnabled
			} = await this.device.getControl2()

			watchdogFlagOutput.value = watchdogAFlag ? '🔔' : '🔕'
			countdownAFlagOutput.value = countdownAFlag ? '🔔' : '🔕'
			countdownBFlagOutput.value = countdownBFlag ? '🔔' : '🔕'
			secondFlagOutput.value = secondFlag ? '🔔' : '🔕'
			alarmFlagOutput.value = alarmFlag ? '🔔' : '🔕'
			watchdogEnabledCheckbox.checked = watchdogAInterruptEnabled
			countdownAEnabledCheckbox.checked = countdownAInterruptEnabled
			countdownBEnabledCheckbox.checked = countdownBInterruptEnabled
		}

		const refreshControl3 = async () => {
			const {
				batterySwitchoverFlag,
				batteryLowFlag,
				pmBatteryLowDetectionEnabled,
				pmSwitchoverEnabled,
				pmDirectSwitchingEnabled,
				batterySwitchoverInterruptEnabled,
				batteryLowInterruptEnabled
			} = await this.device.getControl3()


			powerModeSwitchoverSelect.value = pmSwitchoverEnabled ? 'true' : 'false'
			powerModeModeSelect.value = pmDirectSwitchingEnabled === undefined ? 'undefined' : (pmDirectSwitchingEnabled ? 'true' : 'false')
			powerModeDetectionSelect.value = pmBatteryLowDetectionEnabled ? 'true' : 'false'

			powerModeModeSelect.disabled = pmDirectSwitchingEnabled === undefined

			batterySwitchoverFlagOutput.value = batterySwitchoverFlag ? '🔔' : '🔕'
			batteryLowFlagOutput.value = batteryLowFlag ? '🔔' : '🔕'
			batterySwitchoverEnabledCheckbox.checked = batterySwitchoverInterruptEnabled
			batteryLowEnabledCheckbox.checked = batteryLowInterruptEnabled
		}

		const refreshOffset = async () => {
			const {
				mode,
				offsetValue,
				offsetPPM
			} = await this.device.getOffset()

			offsetModeSelect.value = `${mode}`
			offsetValueNumber.valueAsNumber = offsetValue
			offsetPPMOutput.value = `${offsetPPM} PPM`
		}

		const refreshConfig = async () => {
			await refreshTime_Config()
			await refreshControl1()
			await refreshControl2()
			await refreshControl3()
			await refreshOffset()
		}

		const refreshAlarm = async () => {
			const {
				minuteEnabled,
				minute,
				hourEnabled,
				pm,
				hour,
				dayEnabled,
				day,
				weekdayEnabled,
				weekdayValue,
			} = await this.device.getAlarm(ampm_mode)

			alarmAMPMSelect.disabled = !ampm_mode

			alarmMinuteNumber.disabled = !minuteEnabled
			alarmHourNumber.disabled = !hourEnabled
			alarmDayNumber.disabled = !dayEnabled
			alarmWeekdaySelect.disabled = !weekdayEnabled

			alarmEnableMinuteCheckbox.checked = minuteEnabled
			alarmMinuteNumber.valueAsNumber = minute
			alarmEnableHourCheckbox.checked = hourEnabled
			alarmHourNumber.valueAsNumber = hour
			alarmAMPMSelect.value = ampm_mode ? (pm ? 'pm' : 'am') : '24'
			alarmEnableDayCheckbox.checked = dayEnabled
			alarmDayNumber.valueAsNumber = day
			alarmEnableWeekdayCheckbox.checked = weekdayEnabled
			alarmWeekdaySelect.value = `${weekdayValue}`
		}

		const refreshTimerControl = async () => {
			const {
				interruptAPulsedMode,
				interruptBPulsedMode,
				clockFrequencyValue,
				timerAControl,
				countdownTimerBEnabled
			} = await this.device.getTimerControl()

			timerAInterruptModeSelect.value = interruptAPulsedMode ? 'pulse' : 'permanent'
 			timerBInterruptModeSelect.value = interruptBPulsedMode ? 'pulse' : 'permanent'
			timerClockFrequencySelect.value = `${clockFrequencyValue}`
			timerAConfigurationSelect.value = `${timerAControl}`
			timerBConfigurationSelect.value = countdownTimerBEnabled ? 'true' : 'false'
		}

		const refreshTimerA = async () => {
			const {
				sourceClock
			} = await this.device.getTimerAControl()
			const aValue = await this.device.getTimerAValue()

			const human = timerValueToUnit(sourceClock, aValue)
			const preferredUnit = human.preferred[human.preferred.length - 1]
			const preferred = human[preferredUnit]

			timerASourceClockSelect.value = `${sourceClock}`
			timerAValueNumber.valueAsNumber = aValue
			timerAValueUintOutput.value = `${preferred} ${preferredUnit}`
		}

		const refreshTimerB = async () => {
			const {
				sourceClock,
				pulseWidth
			} = await this.device.getTimerBControl()
			const bValue = await this.device.getTimerBValue()

			const human = timerValueToUnit(sourceClock, bValue)
			const preferredUnit = human.preferred[human.preferred.length - 1]
			const preferred = human[preferredUnit]

			timerBSourceClockSelect.value = `${sourceClock}`
			timerBValueNumber.valueAsNumber = bValue
			timerBValueUnitOutput.value = `${preferred} ${preferredUnit}`

			timerBPulseWidthSelect.value = `${pulseWidth}`
		}

		const refreshTimers = async () => {
			await refreshTimerControl()
			await refreshTimerA()
			await refreshTimerB()
		}

		const refreshAll = async () => {
			await refreshConfig()
			await refreshAlarm()
			await refreshTimers()
		}


		const updateControl1 = async () => {
			await this.device.setControl1({
				capacitorSelection: capacitorSelectionSelect.value,
				stop: false,
				ampm: amPmModeCheckbox.checked,
				secondInterruptEnabled: secondInterruptEnabledCheckbox.checked,
				alarmInterruptEnabled: alarmInterruptEnabledCheckbox.checked,
    		correctionInterruptEnabled: correctionInterruptEnabledCheckbox.checked
			})
		}

		const updateControl2 = async () => {
			await this.device.setControl2({
				watchdogAInterruptEnabled: watchdogEnabledCheckbox.checked,
				countdownAInterruptEnabled: countdownAEnabledCheckbox.checked,
				countdownBInterruptEnabled: countdownBEnabledCheckbox.checked
			})
		}

		const updateControl3 = async () => {
			await this.device.setControl3({
				pmBatteryLowDetectionEnabled: powerModeDetectionSelect.value === 'true',
				pmSwitchoverEnabled: powerModeSwitchoverSelect.value === 'true',
				pmDirectSwitchingEnabled: powerModeModeSelect.value === 'true',

				batterySwitchoverInterruptEnabled: batterySwitchoverEnabledCheckbox.checked,
				batteryLowInterruptEnabled: batteryLowEnabledCheckbox.checked
			})
		}

		const updateOffset = async () => {
			await this.device.setOffset(parseInt(offsetModeSelect.value), offsetValueNumber.valueAsNumber)
		}


		const updateTimerControl = async () => {
			await this.device.setTimerControl({
				interruptAPulsedMode: timerAInterruptModeSelect.value === 'pulse',
				interruptBPulsedMode: timerBInterruptModeSelect.value === 'pulse',
				clockFrequencyValue: parseInt(timerClockFrequencySelect.value),
				timerAControl: parseInt(timerAConfigurationSelect.value),
				countdownTimerBEnabled: timerBConfigurationSelect.value === 'true'
			})
		}

		const updateTimerAControl = async () => {
			await this.device.setTimerAControl({
				sourceClock: parseInt(timerASourceClockSelect.value)
			})
		}

		const updateTimerAValue = async () => {
			await this.device.setTimerAValue(timerAValueNumber.valueAsNumber)
		}


		const updateTimerBControl = async () => {
			await this.device.setTimerBControl({
				sourceClock: parseInt(timerBSourceClockSelect.value),
				pulseWidth: parseInt(timerBPulseWidthSelect.value)
			})
		}

		const updateTimerBValue = async () => {
			await this.device.setTimerBValue(timerBValueNumber.valueAsNumber)
		}


		const updateAlarmMinute = async () => {
			await this.device.setAlarmMinute({
				minute: alarmMinuteNumber.valueAsNumber,
				minuteEnabled: alarmEnableMinuteCheckbox.checked
			})
		}

		const updateAlarmHour = async () => {
			await this.device.setAlarmHour({
				hour: alarmHourNumber.valueAsNumber,
				hourEnabled: alarmEnableHourCheckbox.checked
			})
		}

		const updateAlarmDay = async () => {
			await this.device.setAlarmDay({
				day: alarmDayNumber.valueAsNumber,
				dayEnabled: alarmEnableDayCheckbox.checked
			})
		}

		const updateAlarmWeekday = async () => {
			await this.device.setAlarmWeekday({
				weekdayValue: parseInt(alarmWeekdaySelect.value),
				weekdayEnabled: alarmEnableWeekdayCheckbox.checked
			})
		}



		const clearButtons = root.querySelectorAll('button[command="--clear-interrupt"]')
		clearButtons.forEach(clearButton => clearButton.addEventListener('click', asyncEvent(async () => {
			const interrupt = clearButton.getAttribute('data-interrupt')
			if(interrupt === null) { return }

			const control2interrupts = [
				'watchdog',
				'countdownA',
				'countdownB',
				'second',
				'alarm'
			]
			const control3interrupts = [ 'batterySwitchover' ]

			if(control2interrupts.includes(interrupt)) {
				// control 2
				const control2 = await this.device.getControl2()
				await this.device.setControl2({
					...control2,
					clearWatchdogAFlag: interrupt === 'watchdog',
					clearCountdownAFlag: interrupt === 'countdownA',
					clearCountdownBFlag: interrupt === 'countdownB',
					clearSecondFlag: interrupt === 'second',
					clearAlarmFlag: interrupt === 'alarm'
				})

				await refreshControl2()
			}
			else if(control3interrupts.includes(interrupt)) {
				// control 3
				const control3 = await this.device.getControl3()
				await this.device.setControl3({
					...control3,
					clearBatterySwitchoverFlag: interrupt === 'batterySwitchover'
				})

				await refreshControl3()
			}
			else {
				console.warn('unknown interrupt', interrupt)
			}
		})))

		const refreshButton = elem(root, 'button[command="--refresh"]', HTMLButtonElement)
		refreshButton.addEventListener('click', asyncEvent(async () => {
			await refreshConfig()
		}))

		const setTimeNowButton = elem(root, 'button[command="--set-time"]', HTMLButtonElement)
		setTimeNowButton.addEventListener('click', asyncEvent(async () => {
				const now = new Date(Date.now())
				const time = encodeTimeFromDate(now)
				await this.device.setTime(time, ampm_mode, century)

				await refreshTime_All()
		}))

		const resetButton = elem(root, 'button[command="--reset"]', HTMLButtonElement)
		resetButton.addEventListener('click', asyncEvent(async () => {
			await this.device.softReset()
			await refreshConfig()
		}))

		const refreshTimeOnlyButton = elem(root, 'button[command="--refresh-time-only"]', HTMLButtonElement)
		refreshTimeOnlyButton.addEventListener('click', asyncEvent(async () => {
			await refreshTime_All()
		}))

		const formControl1 = elem(root, 'form[name="FormControl1"]', HTMLFormElement)
		formControl1.addEventListener('change', asyncEvent(async () => {
			await updateControl1()
			await refreshControl1()
		}))

		const formControl2 = elem(root, 'form[name="FormControl2"]', HTMLFormElement)
		formControl2.addEventListener('change', asyncEvent(async () => {
			await updateControl2()
			await refreshControl2()
		}))

		const formControl3 = elem(root, 'form[name="FormControl3"]', HTMLFormElement)
		formControl3.addEventListener('change', asyncEvent(async () => {
			await updateControl3()
			await refreshControl3()
		}))

		const formOffset = elem(root, 'form[name="FormOffset"]', HTMLFormElement)
		formOffset.addEventListener('change', asyncEvent(async () => {
			await updateOffset()
			await refreshOffset()
		}))

		const formTimerControl = elem(root, 'form[name="FormTimerControl"]', HTMLFormElement)
		formTimerControl.addEventListener('change', asyncEvent(async () => {
			await updateTimerControl()
			await refreshTimerControl()
		}))


		timerASourceClockSelect.addEventListener('change', asyncEvent(async () => {
			await updateTimerAControl()
			await refreshTimerA()
		}))
		timerAValueNumber.addEventListener('change', asyncEvent(async () => {
			await updateTimerAValue()
			await refreshTimerA()
		}))



		timerBSourceClockSelect.addEventListener('change', asyncEvent(async () => {
			await updateTimerBControl()
			await refreshTimerB()
		}))
		timerBPulseWidthSelect.addEventListener('change', asyncEvent(async () => {
			await updateTimerBControl()
			await refreshTimerB()
		}))
		timerBValueNumber.addEventListener('change', asyncEvent(async () => {
			await updateTimerBValue()
			await refreshTimerB()
		}))



		alarmEnableMinuteCheckbox.addEventListener('change', asyncEvent(async () => {
			await updateAlarmMinute()
			await refreshAlarm()
		}))

		alarmMinuteNumber.addEventListener('change', asyncEvent(async () => {
			await updateAlarmMinute()
			await refreshAlarm()
		}))

		alarmEnableHourCheckbox.addEventListener('change', asyncEvent(async () => {
			await updateAlarmHour()
			await refreshAlarm()
		}))

		alarmHourNumber.addEventListener('change', asyncEvent(async () => {
			await updateAlarmHour()
			await refreshAlarm()
		}))

		alarmAMPMSelect.addEventListener('change', asyncEvent(async () => {
			await updateAlarmHour()
			await refreshAlarm()
		}))

		alarmEnableDayCheckbox.addEventListener('change', asyncEvent(async () => {
			await updateAlarmDay()
			await refreshAlarm()
		}))

		alarmDayNumber.addEventListener('change', asyncEvent(async () => {
			await updateAlarmDay()
			await refreshAlarm()
		}))

		alarmEnableWeekdayCheckbox.addEventListener('change', asyncEvent(async () => {
			await updateAlarmWeekday()
			await refreshAlarm()
		}))

		alarmWeekdaySelect.addEventListener('change', asyncEvent(async () => {
			await updateAlarmWeekday()
			await refreshAlarm()
		}))



		await refreshAll()
		bindTabRoot(root)
	}
}

