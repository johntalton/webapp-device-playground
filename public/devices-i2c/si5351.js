import { SI5351 } from '@johntalton/si5351'

import { asyncEvent } from '../util/async-event.js'

import { BasicBuilder } from './builder.js'
import { bindTabRoot } from '../util/tabs.js'
import { range } from '../util/range.js'

/**
 * @template T
 * @param {HTMLElement} root
 * @param {string} query
 * @param {new (...args: any[]) => T} type
 * @returns T
 */
function elem(root, query, type) {
	const e = root.querySelector(query)
	if(!(e instanceof type)) { throw new Error('invalid element') }
	return e
}

/** @extends {BasicBuilder<SI5351>} */
export class SI5351Builder extends BasicBuilder {
	static async builder(definition, ui) {
		return new SI5351Builder(definition, ui)
	}

	constructor(definition, ui) {
		super('SI5351 Clock', 'si5351', SI5351, definition, ui)
	}

	async bindCustomView(root) {
		//
		const revisionOutput = elem(root, 'output[name="Revision"]', HTMLOutputElement)
		const initializingOutput = elem(root, 'output[name="Initializing"]', HTMLOutputElement)
		const lolAOutput = elem(root, 'output[name="LOLA"]', HTMLOutputElement)
		const lolBOutput = elem(root, 'output[name="LOLB"]', HTMLOutputElement)
		const losOutput = elem(root, 'output[name="LOS"]', HTMLOutputElement)
		//
		const calibrationOutput = elem(root, 'output[name="Calibration"]', HTMLOutputElement)
		const stickyLOLAOutput = elem(root, 'output[name="StickyLOLA"]', HTMLOutputElement)
		const stickyLOLBOutput = elem(root, 'output[name="StickyLOLB"]', HTMLOutputElement)
		const stickyLOSOutput = elem(root, 'output[name="StickyLOS"]', HTMLOutputElement)
		//
		const crystalCapacitanceSelect = elem(root, 'select[name="CrystalCapacitance"]', HTMLSelectElement)
		const inputSourcePLLASelect = elem(root, 'select[name="InputSourcePLLA"]', HTMLSelectElement)
		const inputSourcePLLBSelect = elem(root, 'select[name="InputSourcePLLB"]', HTMLSelectElement)
		const interruptMaskSystemInitializingCheckbox = elem(root, 'input[name="InterruptMaskSystemInitializing"]', HTMLInputElement)
		const interruptMaskLossOfLockPLLACheckbox = elem(root, 'input[name="InterruptMaskLossOfLockPLLA"]', HTMLInputElement)
		const interruptMaskLossOfLockPLLBCheckbox = elem(root, 'input[name="InterruptMaskLossOfLockPLLB"]', HTMLInputElement)
		const interruptMaskLossOfSignalCheckbox = elem(root, 'input[name="InterruptMaskLossOfSignal"]', HTMLInputElement)
		//
		const clockSelectSelect = elem(root, 'select[name="SelectClock"]', HTMLSelectElement)
		const clockOutputEnabledCheckbox = elem(root, 'input[name="ClockOutputEnabled"]', HTMLInputElement)
		const clockPINControlCheckbox = elem(root, 'input[name="ClockPINControl"]', HTMLInputElement)
		const clockDisableStateSelect = elem(root, 'select[name="ClockDisableState"]', HTMLSelectElement)
		const clockPhaseOffsetSection = elem(root, '[data-phase-offset]', HTMLElement)
		const clockPhaseOffsetNumber = elem(root, 'input[name="ClockPhaseOffset"]', HTMLInputElement)
		const clockPowerDownCheckbox = elem(root, 'input[name="ClockPowerDown"]', HTMLInputElement)
		const clockModeSelect = elem(root, 'select[name="ClockMode"]', HTMLSelectElement)
		const clockMultiSynthSourceSelect = elem(root, 'select[name="ClockMultiSynthSource"]', HTMLSelectElement)
		const clockInvertedCheckbox = elem(root, 'input[name="ClockInverted"]', HTMLInputElement)
		const clockInputSourceSelect = elem(root, 'select[name="ClockInputSource"]', HTMLSelectElement)
		const clockStrengthSelect = elem(root, 'select[name="ClockStrength"]', HTMLSelectElement)
		//
		const extendedParameterSet = elem(root, '[data-extended-parameters]', HTMLElement)
		const parameterP1Number = elem(root, 'input[name="ParameterP1"]', HTMLInputElement)
		const parameterP2Number = elem(root, 'input[name="ParameterP2"]', HTMLInputElement)
		const parameterP3Number = elem(root, 'input[name="ParameterP3"]', HTMLInputElement)
		const dividerSelect = elem(root, 'select[name="ParameterDivider"]', HTMLSelectElement)

		const refreshStatus = async () => {
			const {
				systemInitializing,
				lossOfLockPLLB,
				lossOfLockPLLA,
				lossOfSignal,
				revisionId
			} = await this.device.getDeviceStatus()

			initializingOutput.value = systemInitializing
			lolAOutput.value = lossOfLockPLLA
			lolBOutput.value = lossOfLockPLLB
			losOutput.value = lossOfSignal
			revisionOutput.value = revisionId
		}

		const refreshSticky = async () => {
			const {
				systemCalibrationStatus,
				lossOfLockPLLB,
				lossOfLockPLLA,
				lossOfSignal
			} = await this.device.getInterruptStatusSticky()

			calibrationOutput. value = systemCalibrationStatus
			stickyLOLAOutput. value = lossOfLockPLLA
			stickyLOLBOutput. value = lossOfLockPLLB
			stickyLOSOutput. value = lossOfSignal
		}

		const refreshPLLSource = async () => {
			const { sourcePLLA, sourcePLLB } = await this.device.getPLLInputSource()

			inputSourcePLLASelect.value = sourcePLLA
			inputSourcePLLBSelect.value = sourcePLLB
		}

		const refreshCrystalCapacitance = async () => {
			const { capacitance } = await this.device.getCrystalInternalLoadCapacitance()
			crystalCapacitanceSelect.value = capacitance
		}

		const refreshInterruptMask = async () => {
			const {
				systemInitializing,
				lossOfLockPLLA,
				lossOfLockPLLB,
				lossOfSignal
			} = await this.device.getInterruptStatusMask()

			interruptMaskSystemInitializingCheckbox.checked = systemInitializing
			interruptMaskLossOfLockPLLACheckbox.checked = lossOfLockPLLA
			interruptMaskLossOfLockPLLBCheckbox.checked = lossOfLockPLLB
			interruptMaskLossOfSignalCheckbox.checked = lossOfSignal
		}

		const refreshConfig = async () => {
			await refreshPLLSource()
			await refreshCrystalCapacitance()
			await refreshInterruptMask()
		}

		const refreshOutputEnable = async index => {
			const {
				clock0,
				clock1,
				clock2,
				clock3,
				clock4,
				clock5,
				clock6,
				clock7
			} = await this.device.getOutputEnableControl()

			const clock = [ clock0, clock1, clock2, clock3, clock4, clock5, clock6, clock7 ]

			clockOutputEnabledCheckbox.checked = clock[index]
		}

		const refreshPINControl = async index => {
			const {
				clock0,
				clock1,
				clock2,
				clock3,
				clock4,
				clock5,
				clock6,
				clock7
			} = await this.device.getPinEnabledControl()

			const clock = [ clock0, clock1, clock2, clock3, clock4, clock5, clock6, clock7 ]

			clockPINControlCheckbox.checked = clock[index]
		}

		const refreshPhaseOffset = async index => {
			const hasPhaseOffset = (index <= 5)

			clockPhaseOffsetSection.toggleAttribute('data-active', hasPhaseOffset)

			if(hasPhaseOffset) {
				const phaseOffset =  await this.device.getClockInitialPhaseOffset(index)
				clockPhaseOffsetNumber.value = phaseOffset
			}
		}

		const refreshDisableState = async index => {
			const low = (index < 4)

			if(low) {
				const {
					clock0,
					clock1,
					clock2,
					clock3
				} = await this.device.getClockDisableState3_0()

				const clock = [ clock0, clock1, clock2, clock3 ]

				clockDisableStateSelect.value = clock[index]
			}
			else {
				const {
					clock4,
					clock5,
					clock6,
					clock7
				} = await this.device.getClockDisableState7_4()

				const clock = [ clock4, clock5, clock6, clock7 ]

				clockDisableStateSelect.value = clock[index - 4]
			}
		}

		const refreshClockControl = async index => {
			const {
				poweredDown,
				integerMode,
				multiSynthSourceSelect,
				inverted,
				inputSourceSelect,
    		strength
			} = await this.device.getClockControl(index)

			clockPowerDownCheckbox.checked = poweredDown
			clockModeSelect.value = integerMode
			clockMultiSynthSourceSelect.value = multiSynthSourceSelect
			clockInvertedCheckbox.checked = inverted
			clockInputSourceSelect.value = inputSourceSelect
			clockStrengthSelect.value = strength
		}


		const refreshParameters = async index => {
			const {
				p1, p2, p3, div
			} = await this.device.getMultiSynthParameters(index)

			const hasExtendedParameters = index <= 5

			extendedParameterSet.toggleAttribute('data-active', hasExtendedParameters)

			parameterP1Number.value = p1

			if(hasExtendedParameters) {
				parameterP2Number.value = p2
				parameterP3Number.value = p3
				dividerSelect.value = div
			}
			else {
				const {
					dividerR7,
					dividerR6
				} = await this.device.getClockOutputDivider6_7()

				dividerSelect.value = (index === 6) ? dividerR6 : dividerR7
			}
		}


		const refreshClock = async index => {
			await refreshOutputEnable(index)
			await refreshPINControl(index)
			await refreshPhaseOffset(index)
			await refreshDisableState(index)
			await refreshClockControl(index)

			await refreshParameters(index)
		}

		const refreshAll = async () => {
			await refreshStatus()
			await refreshConfig()
			await refreshSticky()
		}



		const updateCrystalCapacitance = async () => {
			const capacitance = parseInt(crystalCapacitanceSelect.value)
			await this.device.setCrystalInternalLoadCapacitance({ capacitance })
		}

		const updateInterruptMask = async () => {
			const systemInitializing = interruptMaskSystemInitializingCheckbox.checked
			const lossOfLockPLLA = interruptMaskLossOfLockPLLACheckbox.checked
			const lossOfLockPLLB = interruptMaskLossOfLockPLLBCheckbox.checked
			const lossOfSignal = interruptMaskLossOfSignalCheckbox.checked

			await this.device.setInterruptStatusMask({
				systemInitializing,
				lossOfLockPLLA,
				lossOfLockPLLB,
				lossOfSignal
			})

			// pedantic
			await refreshInterruptMask()
		}

		const updateInputSourcePLL = async () => {
			const sourcePLLA = parseInt(inputSourcePLLASelect.value)
			const sourcePLLB = parseInt(inputSourcePLLBSelect.value)
			await this.device.setPLLInputSource({
				sourcePLLA,
				sourcePLLB
			})

			await refreshPLLSource()
		}

		const updateOutputEnabled = async index => {
			const {
				clock0,
				clock1,
				clock2,
				clock3,
				clock4,
				clock5,
				clock6,
				clock7
			} = await this.device.getOutputEnableControl()

			const value = clockOutputEnabledCheckbox.checked

			await this.device.setOutputEnableControl({
				clock0: (index === 0) ? value : clock0,
				clock1: (index === 1) ? value : clock1,
				clock2: (index === 2) ? value : clock2,
				clock3: (index === 3) ? value : clock3,
				clock4: (index === 4) ? value : clock4,
				clock5: (index === 5) ? value : clock5,
				clock6: (index === 6) ? value : clock6,
				clock7: (index === 7) ? value : clock7
			})
		}

		const updatePINControlled = async index => {
			const value = clockPINControlCheckbox.checked

			const {
				clock0,
				clock1,
				clock2,
				clock3,
				clock4,
				clock5,
				clock6,
				clock7
			} = await this.device.getPinEnabledControl()

			await this.device.setPinEnabledControl({
				clock0: (index === 0) ? value : clock0,
				clock1: (index === 1) ? value : clock1,
				clock2: (index === 2) ? value : clock2,
				clock3: (index === 3) ? value : clock3,
				clock4: (index === 4) ? value : clock4,
				clock5: (index === 5) ? value : clock5,
				clock6: (index === 6) ? value : clock6,
				clock7: (index === 7) ? value : clock7
			})

			await refreshPINControl(index)
		}

		const updateDisableState = async index => {
			const low = (index < 4)
			const value = parseInt(clockDisableStateSelect.value)

			if(low) {
				const {
					clock0,
					clock1,
					clock2,
					clock3
				} = await this.device.getClockDisableState3_0()

				await this.device.setClockDisableState3_0({
					clock0: (index === 0) ? value : clock0,
					clock1: (index === 1) ? value : clock1,
					clock2: (index === 2) ? value : clock2,
					clock3: (index === 3) ? value : clock3
				})
			}
			else {
				const {
					clock4,
					clock5,
					clock6,
					clock7
				} = await this.device.getClockDisableState7_4()

				await this.device.setClockDisableState7_4({
					clock4: (index === 4) ? value : clock4,
					clock5: (index === 5) ? value : clock5,
					clock6: (index === 6) ? value : clock6,
					clock7: (index === 7) ? value : clock7
				})
			}

			await refreshDisableState(index)
		}

		const updatePhaseOffset = async index => {
			const phaseOffset = clockPhaseOffsetNumber.value
			await this.device.setClockInitialPhaseOffset(index, phaseOffset)
		}

		const updateClockControl = async index => {
			const poweredDown = clockPowerDownCheckbox.checked
			const integerMode = clockModeSelect.value === true
			const multiSynthSourceSelect = parseInt(clockMultiSynthSourceSelect.value)
			const inverted = clockInvertedCheckbox.checked
			const inputSourceSelect = parseInt(clockInputSourceSelect.value)
			const strength = parseInt(clockStrengthSelect.value)

			await this.device.setClockControl(index, {
				poweredDown,
				integerMode,
				multiSynthSourceSelect,
				inverted,
				inputSourceSelect,
				strength,
			})

			await refreshClockControl(index)
		}

		const updateParameters = async index => {
			const p1 = parseInt(parameterP1Number.value)
			const p2 = parseInt(parameterP2Number.value)
			const p3 = parseInt(parameterP3Number.value)
			const div = parseInt(dividerSelect.value)

			await this.device.setMultiSynthParameters(index, {
				p1, p2, p3, div
			})

			await refreshParameters()
		}

		const updateDivider = async index => {
			const sixSeven = (index === 6) || (index === 7)
			const hasExtendedParameters = index <= 5

			const value = parseInt(dividerSelect.value)

			if(sixSeven) {
				const { dividerR6, dividerR7 } = await this.device.getClockOutputDivider6_7()
				await this.device.setClockOutputDivider6_7({
					dividerR6: (index === 6) ? value : dividerR6,
					dividerR7: (index === 7) ? value : dividerR7
				 })
			}
			else {
				const p1 = parseInt(parameterP1Number.value)
				const p2 = parseInt(parameterP2Number.value)
				const p3 = parseInt(parameterP3Number.value)

				const div = value

				await this.device.setMultiSynthParameters(index, {
					p1, p2, p3, div
				})
			}

			await refreshParameters()
		}






		const refreshStatusButton = elem(root, 'button[command="--refresh-status"]', HTMLButtonElement)
		refreshStatusButton.addEventListener('click', asyncEvent(async event => {
			await refreshStatus()
			await refreshSticky()
		}))

		const resetPLLAButton = elem(root, 'button[command="--reset-pll-a"]', HTMLButtonElement)
		resetPLLAButton.addEventListener('click', asyncEvent(async event => {

			await this.device.setPLLReset({
				resetPLLA: true
			})

			await refreshStatus()
			await refreshSticky()
		}))

		const resetPLLBButton = elem(root, 'button[command="--reset-pll-b"]', HTMLButtonElement)
		resetPLLBButton.addEventListener('click', asyncEvent(async event => {

			await this.device.setPLLReset({
				resetPLLB: true
			})

			await refreshStatus()
			await refreshSticky()
		}))

		const disableAllButton = elem(root, 'button[command="--disable-all"]', HTMLButtonElement)
		disableAllButton.addEventListener('click', asyncEvent(async event => {

			await this.device.setOutputEnableControl({
				clock0: false,
				clock1: false,
				clock2: false,
				clock3: false,
				clock4: false,
				clock5: false,
				clock6: false,
				clock7: false
			})

			const index = parseInt(clockSelectSelect.value)
			await refreshClock(index)
		}))

		const powerDownAllButton = elem(root, 'button[command="--power-down-all"]', HTMLButtonElement)
		powerDownAllButton.addEventListener('click', asyncEvent(async event => {

			for(const index of range(0, 7)) {
				const control = await this.device.getClockControl(index)
				await this.device.setClockControl(index, {
					...control,
					poweredDown: true
				})
			}


			const index = parseInt(clockSelectSelect.value)
			await refreshClock(index)
		}))

		const clearStickyButtons = root.querySelectorAll('button[command="--clear-sticky"]')
		clearStickyButtons.forEach(button => button.addEventListener('click', asyncEvent(async event => {
			const which = button.getAttribute('data-sticky')

			const current = await this.device.getInterruptStatusSticky()

			const systemCalibrationStatus = !(which === 'calibration') && current.systemCalibrationStatus
			const lossOfLockPLLB = !(which === 'lolB') && current.lossOfLockPLLB
			const lossOfLockPLLA = !(which === 'lolA') && current.lossOfLockPLLA
			const lossOfSignal = !(which === 'los') && current.lossOfSignal

			this.device.setInterruptStatusSticky({
				systemCalibrationStatus,
				lossOfLockPLLB,
				lossOfLockPLLA,
				lossOfSignal
			})

			await refreshSticky()
		})))





		crystalCapacitanceSelect.addEventListener('change', asyncEvent(async event => {
			await updateCrystalCapacitance()
		}))

		interruptMaskSystemInitializingCheckbox.addEventListener('click', asyncEvent(async event => {
			await updateInterruptMask()
		}))

		interruptMaskLossOfLockPLLACheckbox.addEventListener('click', asyncEvent(async event => {
			await updateInterruptMask()
		}))

		interruptMaskLossOfLockPLLBCheckbox.addEventListener('click', asyncEvent(async event => {
			await updateInterruptMask()
		}))

		interruptMaskLossOfSignalCheckbox.addEventListener('click', asyncEvent(async event => {
			await updateInterruptMask()
		}))

		inputSourcePLLBSelect.addEventListener('change', asyncEvent(async event => {
			await updateInputSourcePLL()
		}))

		inputSourcePLLASelect.addEventListener('change', asyncEvent(async event => {
			await updateInputSourcePLL()
		}))







		clockSelectSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await refreshClock(index)
		}))

		clockOutputEnabledCheckbox.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateOutputEnabled(index)
		}))

		clockPINControlCheckbox.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updatePINControlled(index)
		}))

		clockDisableStateSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateDisableState(index)
		}))

		clockPhaseOffsetNumber.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updatePhaseOffset(index)
		}))

		clockPowerDownCheckbox.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))

		clockModeSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))

		clockMultiSynthSourceSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))

		clockInvertedCheckbox.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))

		clockInputSourceSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))

		clockStrengthSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateClockControl(index)
		}))



		parameterP1Number.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateParameters(index)
		}))

		parameterP2Number.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateParameters(index)
		}))

		parameterP3Number.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateParameters(index)
		}))

		dividerSelect.addEventListener('change', asyncEvent(async event => {
			const index = parseInt(clockSelectSelect.value)
			await updateDivider(index)
		}))




		await refreshAll()
		await refreshClock(0)

		bindTabRoot(root)
	}
}