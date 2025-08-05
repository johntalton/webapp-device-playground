import { I2CAddressedBus } from '@johntalton/and-other-delights'
import {
	DRV2605,
	DEVICE_ID_MAP,
	WAVEFORM_SEQUENCER_END_ID,
	WAVEFORM_SEQUENCER_MAX_ITEMS
} from '@johntalton/drv2605'

import { asyncEvent } from '../util/async-event.js'
import { bindTabRoot } from '../util/tabs.js'
import { range } from '../util/range.js'

const WAVEFORM_SEQUENCER_CORE_LOOKUP = [
	{ name: 'stop', base: 0 },
	{ name: 'strongClick', base: 1, percents: [ 100, 60, 30 ] },
	{ name: 'sharpClick', base: 4, percents: [ 100, 60, 30 ] },
	{ name: 'softBump', base: 7, percents: [ 100, 60, 30 ] },
	{ name: 'doubleClick', base: 10, percents: [ 100, 60 ] },
	{ name: 'tripleClick', base: 12, percents: [ 100 ] },
	{ name: 'softFuzz', base: 13, percents: [ 60 ] },
	{ name: 'strongBuzz', base: 14, percents: [ 100 ] },
	{ name: 'alert750', base: 15, percents: [ 100 ] },
	{ name: 'alert1000', base: 16, percents: [ 100 ] },
	{ name: 'strongClickAlt', base: 17, percents: [ 100, 80, 60, 30 ] },
	{ name: 'mediumClick', base: 21, percents: [ 100, 80, 60 ] },
	{ name: 'sharpTick', base: 24, percents: [ 100, 80, 60 ] },
	{ name: 'shortDoubleClickStrong', base: 27, percents: [ 100, 80, 60, 30 ] },
	{ name: 'shortDoubleClickMedium', base: 31, percents: [ 100, 80, 60 ] },
	{ name: 'shortDoubleSharpTick', base: 34, percents: [ 100, 80, 60 ] },
	{ name: 'longDoubleSharpClickStrong', base: 37, percents: [ 100, 80, 60, 30 ] },
	{ name: 'longDoubleSharpClickMedium', base: 41, percents: [ 100, 80, 60 ] },
	{ name: 'longDoubleSharpTick', base: 44, percents: [ 100, 80, 60 ] },
	{ name: 'buzz', base: 47, percents: [ 100, 80, 60, 40, 20 ] },
	{ name: 'pulsingStrong', base: 52, percents: [ 100, 60 ] },
	{ name: 'pulsingMedium', base: 54, percents: [ 100, 60 ] },
	{ name: 'pulsingSharp', base: 56, percents: [ 100, 60 ] },
	{ name: 'transitionClick', base: 58, percents: [ 100, 80, 60, 40, 20, 10 ] },
	{ name: 'transitionHum', base: 64, percents: [ 100, 80, 60, 40, 20, 10 ] },

	{ name: 'longBuzz', base: 118, percents: [ 100 ] },
	{ name: 'smoothHum', base: 119, percents: [ 50, 40, 30, 20, 10 ] }
]

const WAVEFORM_SEQUENCER_TRANSFORM_LOOKUP = [
		{ name: 'transitionSmooth', range: [ 70, 75 ], ramp: '100-0' },
		{ name: 'transitionSmooth', range: [ 82, 87 ], ramp: '0-100' },
		{ name: 'transitionSmooth', range: [ 94, 99 ], ramp: '50-0' },
		{ name: 'transitionSmooth', range: [ 106, 111 ], ramp: '0-50' },

		{ name: 'transitionSharp', range: [ 76, 81 ], ramp: '100-0' },
		{ name: 'transitionSharp', range: [ 88, 93 ], ramp: '0-100' },
		{ name: 'transitionSharp', range: [ 100, 105 ], ramp: '50-0' },
		{ name: 'transitionSharp', range: [ 112, 117 ], ramp: '0-50' }
 ]

 const WAVEFORM_SEQUENCER_TRANSFORM_VARIATION_LOOKUP = [
	{ alt: false, strength: 'long' },
	{ alt: true, strength: 'long' },
	{ alt: false, strength: 'medium' },
	{ alt: true, strength: 'medium' },
	{ alt: false, strength: 'short' },
	{ alt: true, strength: 'short' }
 ]

function waveformByID(id) {
	const transitionDef = WAVEFORM_SEQUENCER_TRANSFORM_LOOKUP.find(def => {
		const [ start, end ] = def.range
		if(id >= start && id <= end) { return true }
		return false
	})

	if(transitionDef !== undefined) {
		const base = transitionDef.range[0]
		const variationId = id - base
		const variation = WAVEFORM_SEQUENCER_TRANSFORM_VARIATION_LOOKUP[variationId]
		return {
			...transitionDef,
			...variation
		}
	}

	const DEFAULT_PERCENTS = [ 0 ]

	const effect = WAVEFORM_SEQUENCER_CORE_LOOKUP.find(def => {
		const end = def.base + (def.percents ?? DEFAULT_PERCENTS).length - 1
		if(id >= def.base && id <= end) { return true }
		return false
	})

	if(effect !== undefined) {
		const percentIndex = id - effect.base
		const percent = (effect.percents ?? DEFAULT_PERCENTS)[percentIndex]

		return {
			percent,
			...effect
		}
	}

	return undefined
}


const DEFAULT_PERCENT_INDEX = 0
const DEFAULT_STRENGTH = 'long'
const DEFAULT_ALT = false
const DEFAULT_RAMP = '0-100'
function waveformIDByName(name, options) {

	const definition =  WAVEFORM_SEQUENCER_CORE_LOOKUP.find(def => def.name === name)
	if(definition !== undefined) {
		const _percentIndex = definition.percents?.findIndex(percent => percent === options.percent) ?? DEFAULT_PERCENT_INDEX
		const percentIndex = (_percentIndex === -1) ? DEFAULT_PERCENT_INDEX : _percentIndex
		return definition.base + percentIndex
	}

	const transform = WAVEFORM_SEQUENCER_TRANSFORM_LOOKUP.find(transform => {
		return (transform.name === name) && (transform.ramp === (options.ramp ?? DEFAULT_RAMP))
	})

	if(transform === undefined) { return undefined }

	const variationIndex = WAVEFORM_SEQUENCER_TRANSFORM_VARIATION_LOOKUP.findIndex(variation => {
		return (variation.alt === (options.alt ?? DEFAULT_ALT))
			&& (variation.strength === (options.strength ?? DEFAULT_STRENGTH))
	})

	if(variationIndex === -1) { return undefined }

	const [ rangeStart ] = transform.range
	return rangeStart + variationIndex
}

async function script_basic(device) {
	await device.setOverdriveTimeOffset(0)
	await device.setSustainTimeOffsetPositive(0)
	await device.setSustainTimeOffsetNegative(0)
	await device.setBrakeTimeOffset(0)

	await device.setFeedbackControl({
		N_ERM_LRA: 0, // ERM Mode,
		FB_BRAKE_FACTOR: 3, // 4x
		LOOP_GAIN: 1, // Medium
		BEMF_GAIN: 2
	})

	const control3 = await device.getControl3()
	await device.setControl3({
		...control3,
		ERM_OPEN_LOOP: 1 // open loop
	})

	// await device.setWaveformSequencer1({
	// 	WAV_FRM_SEQ: 88
	// })
	// await device.setWaveformSequencer2({
	// 	WAV_FRM_SEQ: 52
	// })
	// await device.setWaveformSequencer3({
	// 	WAV_FRM_SEQ: 0
	// })
}


export class DRV2605Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DRV2605Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)

	}

	get title() { return 'DRV2605' }

	async open() {
		this.#device = new DRV2605(this.#abus)

	}

	async close() { }

	signature() { }

	async buildCustomView() {
		const response = await fetch('./custom-elements/drv2605.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('drv2605-config')
		if (root === null) { throw new Error('no root for template') }

		// OTP observer
		const otpObserver = new MutationObserver(mutations => _refreshOTP())
		otpObserver.observe(root, { attributes: true, attributeFilter: [ 'data-otp' ] })

		// controls
		const controlsElem = root.querySelector('[data-controls]')
		const goButton = controlsElem?.querySelector('button[name="go"]')
		const stopButton = controlsElem?.querySelector('button[name="stop"]')

		// status
		const deviceIDElem = root.querySelector('output[name="deviceId"]')
		const diagnosticResultCheckbox = root.querySelector('input[name="diagnosticResult"]')
		const overTemperatureCheckbox = root.querySelector('input[name="overTemperature"]')
		const overCurrentCheckbox = root.querySelector('input[name="overCurrent"]')

		// mode
		const standbySelect = root.querySelector('select[name="standby"]')
		const modeSelect = root.querySelector('select[name="mode"]')

		// feedback control
		const deviceModeSelect = root.querySelector('select[name="deviceMode"]')
		const brakeFactorSelect = root.querySelector('select[name="brakeFactor"]')
		const loopGainSelect = root.querySelector('select[name="loopGain"]')
		const analogGainSelect = root.querySelector('select[name="analogGain"]')
		// control 1
		const startupBoostCheckbox = root.querySelector('input[name="startupBoost"]')
		const acCoupleCheckbox = root.querySelector('input[name="acCouple"]')
		const driveTimeRange = root.querySelector('input[name="driveTime"]')
		// control 2
		const bidirInputSelect = root.querySelector('select[name="bidirInput"]')
		const brakeStabilizerCheckbox = root.querySelector('input[name="brakeStabilizer"]')
		const sampleTimeSelect = root.querySelector('select[name="sampleTime"]')
		const blankingTimeSelect = root.querySelector('select[name="blankingTime"]')
		const currentDissipationTimeSelect = root.querySelector('select[name="currentDissipationTime"]')
		// control 3
		const noiseGateThresholdSelect = root.querySelector('select[name="noiseGateThreshold"]')
		const ermModeSelect = root.querySelector('select[name="ermMode"]')
		const supplyCompensationSelect = root.querySelector('select[name="supplyCompensation"]')
		const dataFormatSelect = root.querySelector('select[name="dataFormat"]')
		const lraDriveModeSelect = root.querySelector('select[name="lraDriveMode"]')
		const inputModeTriggerSelect = root.querySelector('select[name="inputModeTrigger"]')
		const lraOpenLoopModeSelect = root.querySelector('select[name="lraOpenLoopMode"]')
		// control 4
		const zeroCrossingDetectSelect = root.querySelector('select[name="zeroCrossingDetect"]')
		const autoCalibrationTimeSelect = root.querySelector('select[name="autoCalibrationTime"]')
		const memoryStatusOutput = root.querySelector('output[name="memoryStatus"]')
		// control 5
		const cycleAttemptsSelect = root.querySelector('select[name="cycleAttempts"]')
		const openLoopTransitionSelect = root.querySelector('select[name="openLoopTransition"]')
		const playbackIntervalSelect = root.querySelector('select[name="playbackInterval"]')
		const blankingTimeMSBNumber = root.querySelector('input[name="blankingTimeMSB"]')
		const currentDissipationTimeMSBNumber = root.querySelector('input[name="currentDissipationTimeMSB"]')

		// parameters
		const overdriveTimeOffsetNumber = root.querySelector('input[name="overdriveTimeOffset"]')
		const sustainTimeOffsetPositiveNumber = root.querySelector('input[name="sustainTimeOffsetPositive"]')
		const sustainTimeOffsetNegativeNumber = root.querySelector('input[name="sustainTimeOffsetNegative"]')
		const breakTimeOffsetNumber = root.querySelector('input[name="breakTimeOffset"]')
		const ratedVoltageNumber = root.querySelector('input[name="ratedVoltage"]')
		const overdriveClampVoltageNumber = root.querySelector('input[name="overdriveClampVoltage"]')
		const lraOpenLoopPeriodNumber = root.querySelector('input[name="lraOpenLoopPeriod"]')
		const vbatVoltageMonitorNumber = root.querySelector('input[name="vbatVoltageMonitor"]')
		const lraPeriodNumber = root.querySelector('input[name="lraPeriod"]')

		// audio to vibe controls
		const a2vDetectionTimeSelect = root.querySelector('select[name="a2vDetectionTime"]')
		const a2vLowPassFilterFrequencySelect = root.querySelector('select[name="a2vLowPassFilterFrequency"]')
		const a2vMinimumInputLevelNumber = root.querySelector('input[name="a2vMinimumInputLevel"]')
		const a2vMaximumInputLevelNumber = root.querySelector('input[name="a2vMaximumInputLevel"]')
		const a2vMinimumOutputDriveNumber = root.querySelector('input[name="a2vMinimumOutputDrive"]')
		const a2vMaximumOutputDriveNumber = root.querySelector('input[name="a2vMaximumOutputDrive"]')

		// auto calibration
		const autoCalibrationCompensationResultNumber = root.querySelector('input[name="autoCalibrationCompensationResult"]')
		const autoCalibrationBackEMFResultNumber = root.querySelector('input[name="autoCalibrationBackEMFResult"]')

		// Realtime
		const rtpInputRange = root.querySelector('input[name="rtpInput"]')


		// waveform listing
		const highImpedanceCheckbox = root.querySelector('input[name="highImpedance"]')
		const waveformLibrarySelect = root.querySelector('select[name="waveformLibrary"]')
		const waveformListing = root.querySelector('[data-waveform-listing]')
		if(!(waveformListing instanceof HTMLOListElement)) { throw new Error('invalid waveform list') }

		const waveformListItemTemplate = waveformListing?.querySelector('template')
		waveformListing.append(...range(0, WAVEFORM_SEQUENCER_MAX_ITEMS - 1).map(index => {
			const doc = waveformListItemTemplate?.content.cloneNode(true)
			if(!(doc instanceof DocumentFragment)) { throw new Error('invalid LI template') }
			const li = doc.querySelector('li')
			if(li === null) { throw new Error('unable to create LI from template') }
			li.toggleAttribute('data-inactive', true)
			li.setAttribute('data-sequence', index + 1)
			return li
		}))
		const waveformListingLIForms = waveformListing.querySelectorAll('li > form')


		if(!(deviceIDElem instanceof HTMLOutputElement)) { throw new Error('missing deviceIDElem') }
		if(!(diagnosticResultCheckbox instanceof HTMLInputElement)) { throw new Error('missing diagnosticResultCheckbox') }
		if(!(overTemperatureCheckbox instanceof HTMLInputElement)) { throw new Error('missing overTemperatureCheckbox') }
		if(!(overCurrentCheckbox instanceof HTMLInputElement)) { throw new Error('missing overCurrentCheckbox') }
		if(!(standbySelect instanceof HTMLSelectElement)) { throw new Error('missing standbySelect') }
		if(!(modeSelect instanceof HTMLSelectElement)) { throw new Error('missing modeSelect') }
		if(!(deviceModeSelect instanceof HTMLSelectElement)) { throw new Error('missing deviceModeSelect') }
		if(!(brakeFactorSelect instanceof HTMLSelectElement)) { throw new Error('missing brakeFactorSelect') }
		if(!(loopGainSelect instanceof HTMLSelectElement)) { throw new Error('missing loopGainSelect') }
		if(!(analogGainSelect instanceof HTMLSelectElement)) { throw new Error('missing analogGainSelect') }
		if(!(startupBoostCheckbox instanceof HTMLInputElement)) { throw new Error('missing startupBoostCheckbox') }
		if(!(acCoupleCheckbox instanceof HTMLInputElement)) { throw new Error('missing acCoupleCheckbox') }
		if(!(driveTimeRange instanceof HTMLInputElement)) { throw new Error('missing driveTimeRange') }
		if(!(bidirInputSelect instanceof HTMLSelectElement)) { throw new Error('missing bidirInputSelect') }
		if(!(brakeStabilizerCheckbox instanceof HTMLInputElement)) { throw new Error('missing brakeStabilizerCheckbox') }
		if(!(sampleTimeSelect instanceof HTMLSelectElement)) { throw new Error('missing sampleTimeSelect') }
		if(!(blankingTimeSelect instanceof HTMLSelectElement)) { throw new Error('missing blankingTimeSelect') }
		if(!(currentDissipationTimeSelect instanceof HTMLSelectElement)) { throw new Error('missing currentDissipationTimeSelect') }
		if(!(noiseGateThresholdSelect instanceof HTMLSelectElement)) { throw new Error('missing noiseGateThresholdSelect') }
		if(!(ermModeSelect instanceof HTMLSelectElement)) { throw new Error('missing ermModeSelect') }
		if(!(supplyCompensationSelect instanceof HTMLSelectElement)) { throw new Error('missing supplyCompensationSelect') }
		if(!(dataFormatSelect instanceof HTMLSelectElement)) { throw new Error('missing dataFormatSelect') }
		if(!(lraDriveModeSelect instanceof HTMLSelectElement)) { throw new Error('missing lraDriveModeSelect') }
		if(!(inputModeTriggerSelect instanceof HTMLSelectElement)) { throw new Error('missing inputModeTriggerSelect') }
		if(!(lraOpenLoopModeSelect instanceof HTMLSelectElement)) { throw new Error('missing lraOpenLoopModeSelect') }
		if(!(zeroCrossingDetectSelect instanceof HTMLSelectElement)) { throw new Error('missing zeroCrossingDetectSelect') }
		if(!(autoCalibrationTimeSelect instanceof HTMLSelectElement)) { throw new Error('missing autoCalibrationTimeSelect') }
		if(!(memoryStatusOutput instanceof HTMLOutputElement)) { throw new Error('missing memoryStatusOutput') }
		if(!(cycleAttemptsSelect instanceof HTMLSelectElement)) { throw new Error('missing cycleAttemptsSelect') }
		if(!(openLoopTransitionSelect instanceof HTMLSelectElement)) { throw new Error('missing openLoopTransitionSelect') }
		if(!(playbackIntervalSelect instanceof HTMLSelectElement)) { throw new Error('missing playbackIntervalSelect') }
		if(!(blankingTimeMSBNumber instanceof HTMLInputElement)) { throw new Error('missing blankingTimeMSBNumber') }
		if(!(currentDissipationTimeMSBNumber instanceof HTMLInputElement)) { throw new Error('missing currentDissipationTimeMSBNumber') }
		if(!(autoCalibrationCompensationResultNumber instanceof HTMLInputElement)) { throw new Error('missing autoCalibrationCompensationResultNumber') }
		if(!(autoCalibrationBackEMFResultNumber instanceof HTMLInputElement)) { throw new Error('missing autoCalibrationBackEMFResultNumber') }
		if(!(a2vDetectionTimeSelect instanceof HTMLSelectElement)) { throw new Error('missing a2vDetectionTimeSelect') }
		if(!(a2vLowPassFilterFrequencySelect instanceof HTMLSelectElement)) { throw new Error('missing a2vLowPassFilterFrequencySelect') }
		if(!(a2vMinimumInputLevelNumber instanceof HTMLInputElement)) { throw new Error('missing a2vMinimumInputLevelNumber') }
		if(!(a2vMaximumInputLevelNumber instanceof HTMLInputElement)) { throw new Error('missing a2vMaximumInputLevelNumber') }
		if(!(a2vMinimumOutputDriveNumber instanceof HTMLInputElement)) { throw new Error('missing a2vMinimumOutputDriveNumber') }
		if(!(a2vMaximumOutputDriveNumber instanceof HTMLInputElement)) { throw new Error('missing a2vMaximumOutputDriveNumber') }
		if(!(overdriveTimeOffsetNumber instanceof HTMLInputElement)) { throw new Error('missing overdriveTimeOffsetNumber') }
		if(!(sustainTimeOffsetPositiveNumber instanceof HTMLInputElement)) { throw new Error('missing sustainTimeOffsetPositiveNumber') }
		if(!(sustainTimeOffsetNegativeNumber instanceof HTMLInputElement)) { throw new Error('missing sustainTimeOffsetNegativeNumber') }
		if(!(breakTimeOffsetNumber instanceof HTMLInputElement)) { throw new Error('missing breakTimeOffsetNumber') }
		if(!(ratedVoltageNumber instanceof HTMLInputElement)) { throw new Error('missing ratedVoltageNumber') }
		if(!(overdriveClampVoltageNumber instanceof HTMLInputElement)) { throw new Error('missing overdriveClampVoltageNumber') }
		if(!(lraOpenLoopPeriodNumber instanceof HTMLInputElement)) { throw new Error('missing lraOpenLoopPeriodNumber') }
		if(!(vbatVoltageMonitorNumber instanceof HTMLInputElement)) { throw new Error('missing vbatVoltageMonitorNumber') }
		if(!(lraPeriodNumber instanceof HTMLInputElement)) { throw new Error('missing lraPeriodNumber') }
		if(!(highImpedanceCheckbox instanceof HTMLInputElement)) { throw new Error('missing highImpedanceCheckbox') }
		if(!(waveformLibrarySelect instanceof HTMLSelectElement)) { throw new Error('missing waveformLibrarySelect') }
		if(!(rtpInputRange instanceof HTMLInputElement)) { throw new Error('missing rtpInputRange') }


		const _refreshOTP = () => {
			const items = root.querySelectorAll('[data-otp]')
			items.forEach(item => {
				const otpLock = root.hasAttribute('data-otp')
				if([ 'SELECT', 'INPUT' ].includes(item.nodeName)) {
					item.disabled = otpLock
				}
			})
		}

		const refreshStatus = async () => {
			const {
				DEVICE_ID,
				DIAG_RESULTS,
				OVER_TEMP,
				OC_DETECT
			} = await this.#device.getStatus()

			const deviceId = `${DEVICE_ID_MAP[DEVICE_ID] ?? 'unknown'} (${DEVICE_ID})`
			deviceIDElem.value = deviceId

			diagnosticResultCheckbox.checked = DIAG_RESULTS
			overTemperatureCheckbox.checked = OVER_TEMP
			overCurrentCheckbox.checked = OC_DETECT
		}

		const refreshMode = async () => {
			const {
				STANDBY,
				MODE
			} = await this.#device.getMode()

			standbySelect.value = STANDBY
			modeSelect.value = MODE
		}

		const refreshFeedbackControl = async () => {
			const feedbackControl = await this.#device.getFeedbackControl()
			console.log(feedbackControl)

			deviceModeSelect.value = feedbackControl.N_ERM_LRA
			brakeFactorSelect.value = feedbackControl.FB_BRAKE_FACTOR
			loopGainSelect.value = feedbackControl.LOOP_GAIN
			analogGainSelect.value = feedbackControl.BEMF_GAIN
		}

		const refreshControl1 = async () => {
			const {
				DRIVE_TIME,
				STARTUP_BOOST,
				AC_COUPLE
			} = await this.#device.getControl1()

			const LRA_MODE_DRIVE_TIME_FACTOR_MS = 0.1
			const ERM_MODE_DRIVE_TIME_FACTOR_MS = 0.2
			const LRA_MODE_DRIVE_TIME_OFFSET_MS = 0.5
			const ERM_MODE_DRIVE_TIME_OFFSET_MS = 1

			const lraMode = false // todo
			const factor = lraMode ? LRA_MODE_DRIVE_TIME_FACTOR_MS : ERM_MODE_DRIVE_TIME_FACTOR_MS
			const offset = lraMode ? LRA_MODE_DRIVE_TIME_OFFSET_MS : ERM_MODE_DRIVE_TIME_OFFSET_MS
			const driveTimeMs = DRIVE_TIME * factor + offset

			startupBoostCheckbox.checked = STARTUP_BOOST
			acCoupleCheckbox.checked = AC_COUPLE
			driveTimeRange.value = driveTimeMs //`${driveTimeMs} ms (${control1.DRIVE_TIME})`

		}

		const refreshControl2 = async () => {
			const {
				BIDIR_INPUT,
				BRAKE_STABILIZER,
				SAMPLE_TIME,
				BLANKING_TIME,
				IDISS_TIME
			} = await this.#device.getControl2()

			bidirInputSelect.value = BIDIR_INPUT
			brakeStabilizerCheckbox.checked = BRAKE_STABILIZER
			sampleTimeSelect.value = SAMPLE_TIME
			blankingTimeSelect.value = BLANKING_TIME
			currentDissipationTimeSelect.value = IDISS_TIME
		}

		const refreshControl3 = async () => {
			const {
				NG_THRESH,
				ERM_OPEN_LOOP,
				SUPPLY_COMP_DIS,
				DATA_FORMAT_RTP,
				LRA_DRIVE_MODE,
				N_PWM_ANALOG,
				LRA_OPEN_LOOP
			} = await this.#device.getControl3()

			noiseGateThresholdSelect.value = NG_THRESH
			ermModeSelect.value = ERM_OPEN_LOOP
			supplyCompensationSelect.value = SUPPLY_COMP_DIS
			dataFormatSelect.value = DATA_FORMAT_RTP
			lraDriveModeSelect.value = LRA_DRIVE_MODE
			inputModeTriggerSelect.value = N_PWM_ANALOG
			lraOpenLoopModeSelect.value = LRA_OPEN_LOOP
		}

		const refreshControl4 = async () => {
			const {
				OTP_STATUS,
				ZC_DET_TIME,
				AUTO_CAL_TIME
			} = await this.#device.getControl4()

			const locked = OTP_STATUS === 1
			const OTP_STATUS_MAP = {
				0: 'Unlocked 🔓',
				1: 'Locked 🔒'
			}

			zeroCrossingDetectSelect.value = ZC_DET_TIME
			autoCalibrationTimeSelect.value = AUTO_CAL_TIME
			memoryStatusOutput.value = OTP_STATUS_MAP[OTP_STATUS]

			// update global otp lock status (observer will lock items)
			root.toggleAttribute('data-otp', OTP_STATUS)
		}

		const refreshControl5 = async () => {
			const {
				AUTO_OL_CNT,
				LRA_AUTO_OPEN_LOOP,
				PLAYBACK_INTERVAL,
				BLANKING_TIME,
				IDISS_TIME
			} = await this.#device.getControl5()

			cycleAttemptsSelect.value = AUTO_OL_CNT
			openLoopTransitionSelect.value = LRA_AUTO_OPEN_LOOP
			playbackIntervalSelect.value = PLAYBACK_INTERVAL
			blankingTimeMSBNumber.value = BLANKING_TIME
			currentDissipationTimeMSBNumber.value = IDISS_TIME
		}

		const refreshLibrary = async () => {
			const {
				HI_Z,
				LIBRARY_SEL
			} = await this.#device.getLibrarySelection()

			highImpedanceCheckbox.checked = HI_Z
			waveformLibrarySelect.value = LIBRARY_SEL
		}

		const WAIT_EFFECT_BASE = {
			name: 'stop',
			percent: 100
		}
		const _refreshWaveform = (liElem, wait, effectId, inactive) => {
			const waitCheckbox = liElem.querySelector('input[name="wait"]')
			if(!(waitCheckbox instanceof HTMLInputElement)) { throw new Error('missing wait checkbox') }

			const waitTimeNumber = liElem.querySelector('input[name="waitTime"]')
			const waveformSeqSelect = liElem.querySelector('select[name="waveformSeq"]')
			const waveformPercentSelect  = liElem.querySelector('select[name="waveformPercent"]')
			const transitionStrengthSelect = liElem.querySelector('select[name="transitionStrength"]')
			const transitionRampSelect = liElem.querySelector('select[name="transitionRamp"]')

			const percentOptions = waveformPercentSelect?.querySelectorAll('option')

			const definition = wait ? { ...WAIT_EFFECT_BASE, waitTime: effectId } : waveformByID(effectId)
			const valid = definition !== undefined
			const hasPercents = definition?.percents !== undefined
			const hasRamp = definition?.ramp !== undefined

			waitTimeNumber.disabled = !valid || !wait
			waveformPercentSelect.disabled = !valid || !hasPercents
			transitionStrengthSelect.disabled = !valid || !hasRamp
			transitionRampSelect.disabled = !valid || !hasRamp

			if(valid && !wait && hasPercents) {
				percentOptions?.forEach(option => {
					const enable = definition.percents.includes(parseInt(option.value))
					option.disabled = !enable
				})
			}


			waitCheckbox.checked = wait
			if(valid) {
				waitTimeNumber.value = definition.waitTime
				waveformSeqSelect.value = definition.name
				waveformPercentSelect.value = definition.percent
				transitionStrengthSelect.value = definition.strength
				transitionRampSelect.value = definition.ramp
			}

			liElem.toggleAttribute('data-inactive', inactive)

			const visible = wait ? 'wait' :
											hasRamp ? 'transition' :
											hasPercents ? 'percent' : 'waveform'

			liElem.setAttribute('data-visible', visible)
		}

		const refreshWaveforms = async () => {
			// const waveforms = [
			// 	await this.#device.getWaveformSequencer1(),
			// 	await this.#device.getWaveformSequencer2(),
			// 	await this.#device.getWaveformSequencer3(),
			// 	await this.#device.getWaveformSequencer4(),
			// 	await this.#device.getWaveformSequencer5(),
			// 	await this.#device.getWaveformSequencer6(),
			// 	await this.#device.getWaveformSequencer7(),
			// 	await this.#device.getWaveformSequencer8()
			// ]

			const waveforms = await this.#device.getWaveformSequences()

			const waveformEndIndex = waveforms.findIndex(waveform => {
				if(waveform.WAIT) { return false }
				if(waveform.WAV_FRM_SEQ !== WAVEFORM_SEQUENCER_END_ID) { return false }
				return true
			})

			waveforms.forEach(({ WAIT, WAV_FRM_SEQ }, index) => {
				const liElem = waveformListing?.querySelector(`:scope > li:nth-of-type(${index + 1})`)
				if(liElem === null) { throw new Error(`missing nth(${index}) LI`) }

				const inactive = waveformEndIndex !== -1 && index > waveformEndIndex
				_refreshWaveform(liElem, WAIT, WAV_FRM_SEQ, inactive)
			})
		}

		const refreshAudioToVibe = async () => {
			const A_CAL_COMP = await this.#device.getAutoCalibrationCompensationResult()
			const A_CAL_BEMF = await this.#device.getAutoCalibrationBackEMFResult()

			autoCalibrationCompensationResultNumber.value = A_CAL_COMP
			autoCalibrationBackEMFResultNumber.value = A_CAL_BEMF
		}

		const refreshAutoCalibration = async () => {
			const {
				ATH_PEAK_TIME,
				ATH_FILTER
			} = await this.#device.getAudioToVibeControl()
			const ATH_MIN_INPUT = await this.#device.getAudioToVibeMinimumInputLevel()
			const ATH_MAX_INPUT = await this.#device.getAudioToVibeMaximumInputLevel()
			const ATH_MIN_DRIVE = await this.#device.getAudioToVibeMinimumOutputDrive()
			const ATH_MAX_DRIVE = await this.#device.getAudioToVibeMaximumOutputDrive()

			a2vDetectionTimeSelect.value = ATH_PEAK_TIME
			a2vLowPassFilterFrequencySelect.value = ATH_FILTER
			a2vMinimumInputLevelNumber.value = ATH_MIN_INPUT
			a2vMaximumInputLevelNumber.value = ATH_MAX_INPUT
			a2vMinimumOutputDriveNumber.value = ATH_MIN_DRIVE
			a2vMaximumOutputDriveNumber.value = ATH_MAX_DRIVE

		}

		const refreshParameters = async () => {
			const ODT = await this.#device.getOverdriveTimeOffset()
			const SPT = await this.#device.getSustainTimeOffsetPositive()
			const SNT = await this.#device.getSustainTimeOffsetNegative()
			const BRT = await this.#device.getBrakeTimeOffset()
			const RATED_VOLTAGE = await this.#device.getRatedVoltage()
			const OD_CLAMP = await this.#device.getOverdriveClampVoltage()
			const OL_LRA_PERIOD = await this.#device.getLRAOpenLoopPeriod()
			const VBAT = await this.#device.getVBATVoltageMonitor()
			const LRA_PERIOD = await this.#device.getLRAResonancePeriod()

			overdriveTimeOffsetNumber.value = ODT
			sustainTimeOffsetPositiveNumber.value = SPT
			sustainTimeOffsetNegativeNumber.value = SNT
			breakTimeOffsetNumber.value = BRT
			ratedVoltageNumber.value = RATED_VOLTAGE
			overdriveClampVoltageNumber.value = OD_CLAMP
			lraOpenLoopPeriodNumber.value = OL_LRA_PERIOD
			vbatVoltageMonitorNumber.value = VBAT
			lraPeriodNumber.value = LRA_PERIOD

			await refreshAudioToVibe()
			await refreshAutoCalibration()
		}

		const refreshRealtime = async () => {
			const RTP = await this.#device.getRealTimePlaybackInput()
			rtpInputRange.value = RTP
		}

		const refreshAll = async () => {
			await refreshStatus()
			await refreshMode()
			await refreshFeedbackControl()
			await refreshControl1()
			await refreshControl2()
			await refreshControl3()
			await refreshControl4()
			await refreshControl5()
			await refreshLibrary()
			await refreshWaveforms()
			await refreshParameters()
			await refreshRealtime()
		}




		const updateMode = async () => {
			const standby = standbySelect.value === 'true'
			const mode = parseInt(modeSelect.value, 10)

			await this.#device.setMode({
				DEV_RESET: false,
				STANDBY: standby,
				MODE: mode
			})

			await refreshMode()
			await refreshStatus()
		}

		const updateControls = async () => {

		}

		const updateWaveform = async item => {

			const li = item.closest('li')
			const sequence = parseInt(li.getAttribute('data-sequence'), 10)

			const fd = new FormData(item.form)
			const wait = fd.get('wait') === 'on'
			const effect = fd.get('waveformSeq')
			const _waitTime = fd.get('waitTime')
			const _percent = fd.get('waveformPercent')
			const alt = false
			const ramp = fd.get('transitionRamp')
			const strength = fd.get('transitionStrength')

			const percent = ((_percent instanceof File) || (_percent === null)) ? 0 : parseInt(_percent, 10)
			const waitTime = ((_waitTime instanceof File) || (_waitTime === null)) ? 0 : parseInt(_waitTime, 10)

			const id = wait ? waitTime : waveformIDByName(effect, { percent, alt, ramp, strength })

			if(id === undefined) { return }



			await this.#device.setWaveformSequencer(sequence, {
				WAIT: wait,
				WAV_FRM_SEQ: id
			})


			// _refreshWaveform(li, wait, id, inactive) // could try more discrete
			return refreshWaveforms() // full pedantic update
		}

		const updateRealtime = async () => {
			const rtp = parseInt(rtpInputRange.value, 10)
			await this.#device.setRealTimePlaybackInput(rtp)
		}






		const commandReset = async () => {
			// await this.#device.setMode({
			// 	DEV_RESET: true,
			// 	// STANDBY: false,
			// 	// MODE: 0
			// })
			await this.#device.reset()

			await refreshAll()
		}

		const commandGo = async () => {
			await this.#device.go()

			await refreshStatus()
		}

		const commandStop = async () => {
			await this.#device.stop()

			await refreshStatus()
		}






		standbySelect?.addEventListener('change', asyncEvent(async event => {
			await updateMode()
		}))

		modeSelect?.addEventListener('change', asyncEvent(async event => {
			await updateMode()
		}))

		waveformListingLIForms.forEach(form => form.addEventListener('change', asyncEvent(async event => {
			await updateWaveform(event.target)
		})))

		rtpInputRange.addEventListener('input', asyncEvent(async event => {
			await updateRealtime()
		}))

		controlsElem?.addEventListener('click', asyncEvent(async event => {
			const command = event.target.getAttribute('command')
		// root.addEventListener('command', asyncEvent(async event => {
			// const { command } = event
			if(command === '--reset') { return await commandReset() }
			else if(command === '--go') { return await commandGo() }
			else if(command === '--stop') { return await commandStop() }

			console.warn('unknown command', command)
		}))


		// scripts
		await script_basic(this.#device)

		// initial refresh all
		await refreshAll()







		// const realtimePlayback = await this.#device.getRealTimePlaybackInput()
		// 	const librarySelection = await this.#device.getLibrarySelection()


		bindTabRoot(root)


		return root
	}
}