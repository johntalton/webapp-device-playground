
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BoschIEU } from '@johntalton/boschieu'
import { asyncEvent } from '../util/async-event.js'
import { delayMs } from '../util/delay.js'
import { range } from '../util/range.js'
import { bindTabRoot } from '../util/tabs.js'

/** @import { BoschSensor, Profile3xx, Measurement3xx, Profile6xx, Measurement6xx, GasSetpoint } from '@johntalton/boschieu' */
/** @import { I2CDefinition } from './device-factory.js' */


export class BoschIEUBuilder extends EventTarget {
	#abus

	/** @type {BoschSensor<any>|undefined} */
	#device

	#durationFormatter = new Intl.DurationFormat('en-US', {
		style: 'narrow',
		secondsDisplay: 'always',
		fractionalDigits: 3
	})

	#celsiusFormatter = new Intl.NumberFormat('en-US', {
		style: 'unit',
		unit: 'celsius',
		unitDisplay: 'short'
	})

	#percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'unit',
		unit: 'percent',
		unitDisplay: 'short',
		numberingSystem: 'roman'
	})

	/**
	 * @param {I2CDefinition} definition
	 */
	static async builder(definition, ui) {
		return new BoschIEUBuilder(definition, ui)
	}

	/**
	 * @param {I2CDefinition} definition
	 */
	constructor(definition, ui) {
		super()

		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'Bosch IEU' }

	/**
	 * @param {string} subtitle
	 */
	#setSubtitle(subtitle) {
		this.dispatchEvent(new CustomEvent('subtitle', {
			detail: subtitle
		}))
	}

	async open() {
		this.#device = await BoschIEU.detect(this.#abus)

		this.#setSubtitle(this.#device.chip.name)

		//
		await this.#device.calibration()

	}

	async close() {}

	signature() {}

	async buildCustomView() {
		const response = await fetch('./custom-elements/bosch-ieu.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('bosch-ieu-config')
		if (root === null) { throw new Error('no root for template') }

		// reset button
		const resetButton = root.querySelector('button[name="Reset"]')
		if(!(resetButton instanceof HTMLButtonElement)) { throw new Error('missing element') }

		// chip
		const chipNameOutput = root.querySelector('output[name="ChipName"]')
		const isCalibratedOutput = root.querySelector('output[name="isCalibrated"]')
		if(!(chipNameOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(isCalibratedOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }

		// features
		const featurePressuredOutput = root.querySelector('output[name="FeaturePressure"]')
		const featureTemperatureOutput = root.querySelector('output[name="FeatureTemperature"]')
		const featureHumidityOutput = root.querySelector('output[name="FeatureHumidity"]')
		const featureGasOutput = root.querySelector('output[name="FeatureGas"]')
		const featureNormalModeOutput = root.querySelector('output[name="FeatureNormalMode"]')
		const featureInterruptOutput = root.querySelector('output[name="FeatureInterrupt"]')
		const featureFIFOOutput = root.querySelector('output[name="FeatureFIFO"]')
		const featureTimeOutput = root.querySelector('output[name="FeatureTime"]')
		if(!(featurePressuredOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureTemperatureOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureHumidityOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureGasOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureNormalModeOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureInterruptOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureFIFOOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(featureTimeOutput instanceof HTMLOutputElement)) { throw new Error('missing element') }


		// measurement
		const measureButton = root.querySelector('button[name="Measure"]')
		if(!(measureButton instanceof HTMLButtonElement)) { throw new Error('missing element')}
		const measurementTemperatureOut = root.querySelector('output[name="MeasurementTemperature"]')
		const measurementSensorTimeOut = root.querySelector('output[name="MeasurementSensorTime"]')
		const measurementPressureOut = root.querySelector('output[name="MeasurementPressure"]')
		const measurementHumidityOut = root.querySelector('output[name="MeasurementHumidity"]')
		const measurementGasOut = root.querySelector('output[name="MeasurementGas"]')
		if(!(measurementTemperatureOut instanceof HTMLOutputElement)) { throw new Error('missing element')}
		if(!(measurementSensorTimeOut instanceof HTMLOutputElement)) { throw new Error('missing element')}
		if(!(measurementPressureOut instanceof HTMLOutputElement)) { throw new Error('missing element')}
		if(!(measurementHumidityOut instanceof HTMLOutputElement)) { throw new Error('missing element')}
		if(!(measurementGasOut instanceof HTMLOutputElement)) { throw new Error('missing element')}

		// profile
		const profileForm = root.querySelector('form[name="ProfileForm"]')
		if(!(profileForm instanceof HTMLFormElement)) { throw new Error('missing element') }

		// mode
		const modeSelect = root.querySelector('select[name="Mode"]')
		if(!(modeSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }

		// profile 3xx
		const fifoForm = root.querySelector('form[name="FifoForm"]')
		if(!(fifoForm instanceof HTMLFormElement)) { throw new Error('missing element') }
		const oversamplingTemperature3xxSelect = root.querySelector('select[name="OversamplingTemperature3xx"]')
		const oversamplingPressure3xxSelect = root.querySelector('select[name="OversamplingPressure3xx"]')
		const filterCoefficient3xxSelect = root.querySelector('select[name="FilterCoefficient3xx"]')
		const standbyPrescaler3xxSelect = root.querySelector('select[name="StandbyPrescaler3xx"]')
		const watchDog3xxSelect = root.querySelector('select[name="WatchDog3xx"]')
		const spiMode3xxSelect = root.querySelector('select[name="SPIMode3xx"]')
		if(!(oversamplingTemperature3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(oversamplingPressure3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(filterCoefficient3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(standbyPrescaler3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(watchDog3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(spiMode3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		//
		const interruptMode3xxSelect = root.querySelector('select[name="InterruptMode3xx"]')
		const interruptLevel3xxSelect = root.querySelector('select[name="InterruptLevel3xx"]')
		const interruptDriveStrength3xxSelect = root.querySelector('select[name="InterruptDriveStrength3xx"]')
		const interruptLatched3xxCheckbox = root.querySelector('input[name="InterruptLatched3xx"]')
		const interruptFIFOHightWatermark3xxCheckbox = root.querySelector('input[name="InterruptFIFOHightWatermark3xx"]')
		const interruptFIFOFull3xxCheckbox = root.querySelector('input[name="InterruptFIFOFull3xx"]')
		const interruptDataReady3xxCheckbox = root.querySelector('input[name="InterruptDataReady3xx"]')
		if(!(interruptMode3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(interruptLevel3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(interruptDriveStrength3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(interruptLatched3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(interruptFIFOHightWatermark3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(interruptFIFOFull3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(interruptDataReady3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		//
		const fifoEnable3xxCheckbox = root.querySelector('input[name="FifoEnable3xx"]')
		const fifoStopOnFull3xxCheckbox = root.querySelector('input[name="FifoStopOnFull3xx"]')
		const fifoTemperature3xxCheckbox = root.querySelector('input[name="FifoTemperature3xx"]')
		const fifoPressure3xxCheckbox = root.querySelector('input[name="FifoPressure3xx"]')
		const fifoTime3xxCheckbox = root.querySelector('input[name="FifoTime3xx"]')
		const fifoFilter3xxSelect = root.querySelector('select[name="FifoFilter3xx"]')
		const fifoSubSampling3xxNumber = root.querySelector('input[name="FifoSubSampling3xx"]')
		const fifoHighWatermark3xxNumber = root.querySelector('input[name="FifoHighWatermark3xx"]')
		if(!(fifoEnable3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoStopOnFull3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoTemperature3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoPressure3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoTime3xxCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoFilter3xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(fifoSubSampling3xxNumber instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(fifoHighWatermark3xxNumber instanceof HTMLInputElement)) { throw new Error('missing element') }

		// status 3xx
		const measurementTemperatureReady3xxOut = root.querySelector('output[name="MeasurementTemperatureReady3xx"]')
		const measurementPressureReady3xxOut = root.querySelector('output[name="MeasurementPressureReady3xx"]')
		const measurementCommandReady3xxOut = root.querySelector('output[name="MeasurementCommandReady3xx"]')
		const measurementConfigError3xxOut = root.querySelector('output[name="MeasurementConfigError3xx"]')
		const measurementCommandError3xxOut = root.querySelector('output[name="MeasurementCommandError3xx"]')
		const measurementFatalError3xxOut = root.querySelector('output[name="MeasurementFatalError3xx"]')
		if(!(measurementTemperatureReady3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementPressureReady3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementCommandReady3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementConfigError3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementCommandError3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementFatalError3xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }



		// profile 6xx
		const oversamplingTemperature6xxSelect = root.querySelector('select[name="OversamplingTemperature6xx"]')
		const oversamplingPressure6xxSelect = root.querySelector('select[name="OversamplingPressure6xx"]')
		const oversamplingHumidity6xxSelect = root.querySelector('select[name="OversamplingHumidity6xx"]')
		const filterCoefficient6xxSelect = root.querySelector('select[name="FilterCoefficient6xx"]')
		const spiMode6xxSelect = root.querySelector('select[name="SPIMode6xx"]')
		const spiPage6xxSelect = root.querySelector('select[name="SPIPage6xx"]')
		if(!(oversamplingTemperature6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(oversamplingPressure6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(oversamplingHumidity6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(filterCoefficient6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(spiMode6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		if(!(spiPage6xxSelect instanceof HTMLSelectElement)) { throw new Error('missing element') }
		const enableHeatCheckbox = root.querySelector('input[name="EnableGasHeat"]')
		const enableConversionCheckbox = root.querySelector('input[name="EnableGasConversion"]')
		const sharedGasWaitInput = root.querySelector('input[name="SharedGasWaitDuration"]')
		if(!(enableHeatCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(enableConversionCheckbox instanceof HTMLInputElement)) { throw new Error('missing element') }
		if(!(sharedGasWaitInput instanceof HTMLInputElement)) { throw new Error('missing element') }

		// status 6xx
		const measurementNewData6xxOut = root.querySelector('output[name="MeasurementNewData6xx"]')
		const measurementMeasuring6xxOut = root.querySelector('output[name="MeasurementMeasuring6xx"]')
		const measurementMeasuringGas6xxOut = root.querySelector('output[name="MeasurementMeasuringGas6xx"]')
		const measurementGasValid6xxOut = root.querySelector('output[name="MeasurementGasValid6xx"]')
		const measurementHeaterStable6xxOut = root.querySelector('output[name="MeasurementHeaterStable6xx"]')
		const measurementActiveProfileIndex6xxOut = root.querySelector('output[name="MeasurementActiveProfileIndex6xx"]')
		const measurementSubIndex6xxOut = root.querySelector('output[name="MeasurementSubIndex6xx"]')
		if(!(measurementNewData6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementMeasuring6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementMeasuringGas6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementGasValid6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementHeaterStable6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementActiveProfileIndex6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }
		if(!(measurementSubIndex6xxOut instanceof HTMLOutputElement)) { throw new Error('missing element') }


		// Setpoint
		const setpointSaveButton = root.querySelector('button[name="SetpointSave"]')
		const setpointResetButton = root.querySelector('button[name="SetpointReset"]')
		const setpointForm = root.querySelector('form[name="SetpointForm"]')
		if(!(setpointForm instanceof HTMLFormElement)) { throw new Error('missing element') }
		if(!(setpointSaveButton instanceof HTMLButtonElement)) { throw new Error('missing element') }
		if(!(setpointResetButton instanceof HTMLButtonElement)) { throw new Error('missing element') }

		const kindObserver = new MutationObserver(mutations => {
			console.log('kind mutation', mutations)

			const kind = root.getAttribute('kind')

			const kindNodes = root.querySelectorAll('[data-kind]')
			for(const kindNode of kindNodes) {
				const active = kindNode.dataset.kind.includes(kind)
				kindNode.toggleAttribute('data-kind-active', active)
			}
		})
		kindObserver.observe(root, { attributes: true, attributeFilter: [ 'kind' ] })

		//
		const refreshChip = async () => {
			if(this.#device === undefined) { return }

			//
			root.setAttribute('kind', this.#device.chip.kind)

			//
			for(const option of modeSelect.options) {
				const enabled = this.#device.chip.features.modes.includes(option.value)
				option.disabled = !enabled
			}

			//
			chipNameOutput.textContent = this.#device.chip.name ?? ''
			isCalibratedOutput.textContent = this.#device.calibrated ? '👍' : '👎'

			featurePressuredOutput.textContent = this.#device.chip.features.pressure ? '✅' : '-'
			featureTemperatureOutput.textContent = this.#device.chip.features.temperature ? '✅' : '-'
			featureHumidityOutput.textContent = this.#device.chip.features.humidity ? '✅' : '-'
			featureGasOutput.textContent = this.#device.chip.features.gas ? '✅' : '-'
			featureNormalModeOutput.textContent = this.#device.chip.features.normalMode ? '✅' : '-'
			featureInterruptOutput.textContent = this.#device.chip.features.interrupt ? '✅' : '-'
			featureFIFOOutput.textContent = this.#device.chip.features.fifo ? '✅' : '-'
			featureTimeOutput.textContent = this.#device.chip.features.time ? '✅' : '-'
		}

		/** @type {(profile: Profile3xx) => void} */
		const _refreshProfile3xx = profile => {
			oversamplingTemperature3xxSelect.value = `${profile.oversampling_t}`
			oversamplingPressure3xxSelect.value = `${profile.oversampling_p}`
			filterCoefficient3xxSelect.value = `${profile.filter_coefficient}`

			standbyPrescaler3xxSelect.value = `${profile.standby_prescaler}`
			watchDog3xxSelect.value = `${profile.watchdog}`
			spiMode3xxSelect.value = profile.spi.mode

			interruptMode3xxSelect.value = profile.interrupt.mode
			interruptLevel3xxSelect.value = profile.interrupt.level
			interruptDriveStrength3xxSelect.value = profile.interrupt.driveStrength
			interruptLatched3xxCheckbox.checked = profile.interrupt.latched
			interruptFIFOHightWatermark3xxCheckbox.checked = profile.interrupt.onFifoWatermark
			interruptFIFOFull3xxCheckbox.checked = profile.interrupt.onFifoFull
			interruptDataReady3xxCheckbox.checked = profile.interrupt.onReady

			fifoEnable3xxCheckbox.checked = profile.fifo.active
			fifoStopOnFull3xxCheckbox.checked = profile.fifo.stopOnFull
			fifoTemperature3xxCheckbox.checked = profile.fifo.temp
			fifoPressure3xxCheckbox.checked = profile.fifo.press
			fifoTime3xxCheckbox.checked = profile.fifo.time
			fifoFilter3xxSelect.value = profile.fifo.data
			fifoSubSampling3xxNumber.valueAsNumber = profile.fifo.subSampling
			fifoHighWatermark3xxNumber.valueAsNumber = profile.fifo.highWatermark
		}

		/** @type {(profile: Profile6xx) => void} */
		const _refreshProfile6xx = profile => {
			oversamplingTemperature6xxSelect.value = `${profile.oversampling_t}`
			oversamplingPressure6xxSelect.value = `${profile.oversampling_p}`
			oversamplingHumidity6xxSelect.value = `${profile.oversampling_h}`
			filterCoefficient6xxSelect.value = `${profile.filter_coefficient}`
			spiMode6xxSelect.value = profile.spi.mode
			spiPage6xxSelect.value = `${profile.spi.page}`

			enableHeatCheckbox.checked = profile.gas.heaterEnabled
			enableConversionCheckbox.checked = profile.gas.conversionEnabled

			if(profile.gas.gas_wait_shared === undefined) {
				sharedGasWaitInput.disabled = true
			}
			else {
				sharedGasWaitInput.disabled = false
				sharedGasWaitInput.valueAsNumber = profile.gas.gas_wait_shared
			}

			for(const setpoint of profile.gas.setpoints) {
				const {
					index,
					temperatureC,
					durationMs,
					initialMa,
					selected
				} = setpoint

				const spTempElem = root.querySelector(`input[name="SetpointTemperature_${index}"]`)
				const spDurationElem = root.querySelector(`input[name="SetpointDuration_${index}"]`)
				const spInitialElem = root.querySelector(`input[name="SetpointInitial_${index}"]`)
				const selectRadio = root.querySelector(`input[name="SetpointSelect"][value="${index}"]`)
				if(!(spTempElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spDurationElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spInitialElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(selectRadio instanceof HTMLInputElement)) { throw new Error('missing element') }

				spTempElem.disabled = false
				spDurationElem.disabled = false
				spInitialElem.disabled = false
				selectRadio.disabled = false

				spTempElem.valueAsNumber = temperatureC
				spDurationElem.valueAsNumber = durationMs
				spInitialElem.valueAsNumber = initialMa
				selectRadio.checked = selected
			}
		}

		const refreshProfile = async () => {
			if(this.#device === undefined) { return }

			const profile = await this.#device.profile()
			console.log('configured profile', profile)

			modeSelect.value = profile.mode

			if(this.#device.chip.kind === '3xx') {
				_refreshProfile3xx(profile)
			}
			else if(this.#device.chip.kind === '6xx') {
				_refreshProfile6xx(profile)
			}
			else {
				console.warn('unknown profile refresh kind', this.#device.chip.kind)
			}

		}

		const _clearMeasurement = () => {
			measurementSensorTimeOut.textContent = '-'
			measurementTemperatureOut.textContent = '-'
			measurementPressureOut.textContent = '-'
			measurementHumidityOut.textContent = '-'
			measurementGasOut.textContent = '-'

			// 3xx
			measurementTemperatureReady3xxOut.textContent = '-'
			measurementPressureReady3xxOut.textContent = '-'
			measurementCommandReady3xxOut.textContent = '-'
			measurementConfigError3xxOut.textContent = '-'
			measurementCommandError3xxOut.textContent = '-'
			measurementFatalError3xxOut.textContent = '-'
		}

		/** @type {(measurement3xx: Measurement3xx) => void} */
		const _refreshMeasurement3xx = measurement3xx => {
			const {
				temperature,
				pressure,
				command,
				errorConfiguration,
				errorCommand,
				errorFatal
			} = measurement3xx.ready

			measurementTemperatureReady3xxOut.textContent = temperature ? '👍' : '👎'
			measurementPressureReady3xxOut.textContent = pressure ? '👍' : '👎'
			measurementCommandReady3xxOut.textContent = command ? '👍' : '👎'
			measurementConfigError3xxOut.textContent = errorConfiguration ? '🛑' : '(no error)'
			measurementCommandError3xxOut.textContent = errorCommand ? '🛑' : '(no error)'
			measurementFatalError3xxOut.textContent = errorFatal ? '🛑' : '(no error)'

		}

		/** @type {(measurement6xx: Measurement6xx) => void} */
		const _refreshMeasurement6xx = measurement6xx => {
			const {
				newData,
				measuring,
				measuringGas,
				gasValid,
				heaterStable,
				active_profile_idx,
				sub_measuring_index
			} = measurement6xx.ready

			measurementNewData6xxOut.value = newData ? '👍' : '👎'
			measurementMeasuring6xxOut.value = measuring ? '⚠️' : ''
			measurementMeasuringGas6xxOut.value = measuringGas ? '⚠️' : ''
			measurementGasValid6xxOut.value = gasValid ? '👍' : '👎'
			measurementHeaterStable6xxOut.value = heaterStable ? '👍' : '👎'
			measurementActiveProfileIndex6xxOut.value = `${active_profile_idx}`
			measurementSubIndex6xxOut.value = `${sub_measuring_index ?? '(none)'}`



		}

		const refreshMeasurement = async () => {
			if(this.#device === undefined) { return }

			_clearMeasurement()

			const measurement = await this.#device.measurement()
			console.log('measurement', measurement)

			if(measurement === undefined) {
				console.warn('undefined measurement')
				return
			}

			if(measurement.sensorTime !== undefined) {
				const textST = this.#durationFormatter.format(
					measurement.sensorTime.duration
						.round({ largestUnit: 'minutes', smallestUnit: 'milliseconds' }))

				measurementSensorTimeOut.textContent = `${textST} (${measurement.sensorTime.ticks})`
			}

			if(measurement.temperature !== undefined) {
				const textT = measurement.temperature.skip ?
					`(skipped) [${measurement.temperature.why}]` :
					//`${Math.round(measurement.temperature.C * 1000) / 1000} C`
					`${this.#celsiusFormatter.format(measurement.temperature.C)}`

				measurementTemperatureOut.textContent = textT
			}

			if(measurement.pressure !== undefined) {
				const textP = measurement.pressure.skip ?
					`(skipped) [${measurement.pressure.why}]`:
					`${Math.round(measurement.pressure.Pa * 100) / 100} Pa`
				measurementPressureOut.textContent = textP
			}

			if(measurement.humidity !== undefined) {
				const textH = measurement.humidity.skip ?
					`(skipped) [${measurement.humidity.why}]` :
					`${this.#percentFormatter.format(measurement.humidity.percent)}`
				measurementHumidityOut.textContent = textH
			}

			if(measurement.gas !== undefined) {
				const textG = measurement.gas.skip ?
					`(skipped) [${measurement.gas.why}]` :
					`${Math.round(measurement.gas.Ohm * 100) / 100} Ω (Ohm)`
				measurementGasOut.textContent = textG
			}



			//
			if(this.#device.chip.kind === '2xx') {
				// _refreshMeasurement2xx(measurement)
			}
			else if(this.#device.chip.kind === '3xx') {
				_refreshMeasurement3xx(measurement)
			}
			else if(this.#device.chip.kind === '5xx') {
				// _refreshMeasurement5xx(measurement)
			}
			else if(this.#device.chip.kind === '6xx') {
				_refreshMeasurement6xx(measurement)
			}
			else {
				console.warn('unknown chip kind', this.#device.chip.kind)
			}
		}

		//
		//
		//
		const _updateProfile3xx = async () => {
			if(this.#device === undefined) { return }

			const mode = modeSelect.value
			const standby_prescaler = Number.parseInt(standbyPrescaler3xxSelect.value, 10)

			const spiMode = spiMode3xxSelect.value

			const watchdog = watchDog3xxSelect.value === 'false' ?
				false :
				watchDog3xxSelect.value

			const filter_coefficient = filterCoefficient3xxSelect.value === 'false' ?
				false :
				Number.parseInt(filterCoefficient3xxSelect.value, 10)
			const oversampling_t = oversamplingTemperature3xxSelect.value === 'false' ?
				false :
				Number.parseInt(oversamplingTemperature3xxSelect.value, 10)
			const oversampling_p = oversamplingPressure3xxSelect.value === 'false' ?
				false :
				Number.parseInt(oversamplingPressure3xxSelect.value, 10)

			const interruptMode = interruptMode3xxSelect.value
			const level = interruptLevel3xxSelect.value
			const driveStrength = interruptDriveStrength3xxSelect.value
			const latched = interruptLatched3xxCheckbox.checked
			const onFifoWatermark = interruptFIFOHightWatermark3xxCheckbox.checked
			const onFifoFull = interruptFIFOFull3xxCheckbox.checked
			const onReady = interruptDataReady3xxCheckbox.checked

			const active = fifoEnable3xxCheckbox.checked
			const stopOnFull = fifoStopOnFull3xxCheckbox.checked
			const temp = fifoTemperature3xxCheckbox.checked
			const press = fifoPressure3xxCheckbox.checked
			const time = fifoTime3xxCheckbox.checked
			const data = fifoFilter3xxSelect.value
			const subSampling = fifoSubSampling3xxNumber.valueAsNumber
			const highWatermark = fifoHighWatermark3xxNumber.valueAsNumber


			/** @type {Profile3xx} */
			const profile = {
				mode,

				standby_prescaler,
				oversampling_p,
				oversampling_t,
				filter_coefficient,

				watchdog,

				spi: {
					mode: spiMode,
					page: 0 // no paging for 3xx
				},

				fifo: {
					active,
					stopOnFull,
					temp,
					press,
					time,
					data,
					subSampling,
					highWatermark
				},

				interrupt: {
					mode: interruptMode,
					level,
					driveStrength,
					latched,
					onFifoWatermark,
					onFifoFull,
					onReady
				}
			}

			await this.#device.setProfile(profile)
		}

		const _clearSetpoints = () => {
			for(const index of range(0, 9)) {
				const spTempElem = root.querySelector(`input[name="SetpointTemperature_${index}"]`)
				const spDurationElem = root.querySelector(`input[name="SetpointDuration_${index}"]`)
				const spInitialElem = root.querySelector(`input[name="SetpointInitial_${index}"]`)
				const selectRadio = root.querySelector(`input[name="SetpointSelect"][value="${index}"]`)
				if(!(spTempElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spDurationElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spInitialElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(selectRadio instanceof HTMLInputElement)) { throw new Error('missing element') }

				spTempElem.valueAsNumber = 0
				spDurationElem.valueAsNumber = 0
				spInitialElem.valueAsNumber = 0

				selectRadio.checked = index === 0
			}
		}

		const _enabledSetpoints = enabled => {
			for(const index of range(0, 9)) {
				const spTempElem = root.querySelector(`input[name="SetpointTemperature_${index}"]`)
				const spDurationElem = root.querySelector(`input[name="SetpointDuration_${index}"]`)
				const spInitialElem = root.querySelector(`input[name="SetpointInitial_${index}"]`)
				const selectRadio = root.querySelector(`input[name="SetpointSelect"][value="${index}"]`)
				if(!(spTempElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spDurationElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spInitialElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(selectRadio instanceof HTMLInputElement)) { throw new Error('missing element') }

				spTempElem.disabled = !enabled
				spDurationElem.disabled = !enabled
				spInitialElem.disabled = !enabled
				selectRadio.disabled = !enabled
			}
		}

		const _updateProfile6xx = async () => {
			if(this.#device === undefined) { return }

			const mode = modeSelect.value

			const oversampling_t = oversamplingTemperature6xxSelect.value === 'false' ? false : Number.parseInt(oversamplingTemperature6xxSelect.value, 10)
			const oversampling_p = oversamplingPressure6xxSelect.value === 'false' ? false : Number.parseInt(oversamplingPressure6xxSelect.value, 10)
			const oversampling_h = oversamplingHumidity6xxSelect.value === 'false' ? false : Number.parseInt(oversamplingHumidity6xxSelect.value, 10)
			const filter_coefficient = filterCoefficient6xxSelect.value === 'false' ? false : Number.parseInt(filterCoefficient6xxSelect.value, 10)

			const spiMode = spiMode6xxSelect.value
			const page = Number.parseInt(spiPage6xxSelect.value, 10)

			const heaterEnabled = enableHeatCheckbox.checked
			const conversionEnabled = enableConversionCheckbox.checked

			/** @type {Array<GasSetpoint>} */
			const setpoints = range(0, 9).map(index => {
				const spTempElem = root.querySelector(`input[name="SetpointTemperature_${index}"]`)
				const spDurationElem = root.querySelector(`input[name="SetpointDuration_${index}"]`)
				const spInitialElem = root.querySelector(`input[name="SetpointInitial_${index}"]`)
				const selectRadio = root.querySelector(`input[name="SetpointSelect"][value="${index}"]`)
				if(!(spTempElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spDurationElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(spInitialElem instanceof HTMLInputElement)) { throw new Error('missing element') }
				if(!(selectRadio instanceof HTMLInputElement)) { throw new Error('missing element') }

				const selected = selectRadio.checked
				const temperatureC = spTempElem.valueAsNumber
				const durationMs = spDurationElem.valueAsNumber
				const initialMa = spInitialElem.valueAsNumber

				return {
					index,
					selected,
					temperatureC,
					durationMs,
					initialMa
				}
			}).toArray()

			const gas_wait_shared = sharedGasWaitInput.valueAsNumber

			/** @type {Profile6xx} */
			const profile = {
				mode,

				oversampling_p,
				oversampling_t,
				oversampling_h,
				filter_coefficient,

				gas: {
					conversionEnabled,
					heaterEnabled,
					gas_wait_shared,
					setpoints
				},

				spi: {
					page,
					mode: spiMode
				}
			}

			await this.#device.setProfile(profile)
		}

		const updateProfile = async () => {
			if(this.#device === undefined) { return }

			const { kind } = this.#device.chip

			if(kind === '2xx') {
				// await _updateProfile2xx()
			}
			else if(kind === '3xx') {
				await _updateProfile3xx()
			}
			else if(kind === '5xx') {
				// await _updateProfile5xx()
			}
			else if(kind === '6xx') {
				await _updateProfile6xx()
			}
			else {
				console.log('unknown kind for profile update', kind)
			}
		}


		const _updateMode3xx = async () => {
			if(this.#device === undefined) { return }

			const mode = modeSelect.value

			const oversampling_t = oversamplingTemperature3xxSelect.value === 'false' ? false : Number.parseInt(oversamplingTemperature3xxSelect.value, 10)
			const oversampling_p = oversamplingPressure3xxSelect.value === 'false' ? false : Number.parseInt(oversamplingPressure3xxSelect.value, 10)

			await this.#device.setMode({
				mode,
				oversampling_t,
				oversampling_p
			})
		}

		const _updateMode6xx = async () => {
			if(this.#device === undefined) { return }

			const mode = modeSelect.value

			const oversampling_t = oversamplingTemperature6xxSelect.value === 'false' ? false : Number.parseInt(oversamplingTemperature6xxSelect.value, 10)
			const oversampling_p = oversamplingPressure6xxSelect.value === 'false' ? false : Number.parseInt(oversamplingPressure6xxSelect.value, 10)

			await this.#device.setMode({
				mode,
				oversampling_t,
				oversampling_p
			})
		}

		const updateMode = async () => {
			if(this.#device === undefined) { return }

			const { kind } = this.#device.chip

			if(kind === '2xx') {
				// await _updateMode2xx()
			}
			else if(kind === '3xx') {
				await _updateMode3xx()
			}
			else if(kind === '5xx') {
				// await _updateMode5xx()
			}
			else if(kind === '6xx') {
				await _updateMode6xx()
			}
			else {
				console.log('unknown kind for mode update', kind)
			}
		}

		//
		//
		//
		resetButton.addEventListener('click', asyncEvent(async event => {
			if(this.#device === undefined) { return }

			await this.#device.reset()

			await refreshChip()
			await refreshProfile()
			_clearMeasurement()

		}))

		modeSelect.addEventListener('change', asyncEvent(async event => {
			//
			console.log('mode change')

			await updateMode()
			await delayMs(20)
			await refreshProfile()
		}))

		profileForm.addEventListener('change', asyncEvent(async event => {
			if(event.target.name === 'Mode') {
				// handled via mode select
				return
			}

			await updateProfile()
			await delayMs(20)
			await refreshProfile()
		}))

		fifoForm.addEventListener('change', asyncEvent(async event => {
			await updateProfile()
			await delayMs(20)
			await refreshProfile()
		}))

		setpointForm.addEventListener('change', asyncEvent(async event => {
			const { target } = event

			if(target.name === 'SetpointSelect') {
				console.log('selected index changed', target.value)
			}
			else {
				//console.log('input change')
			}

		}))

		setpointSaveButton.addEventListener('click', asyncEvent(async event => {
			console.log('save setpoints')
			_enabledSetpoints(false)
			await updateProfile()
			await delayMs(20)
			await refreshProfile()
		}))

		setpointResetButton.addEventListener('click', asyncEvent(async event => {
			console.log('reset setpoints')
			_enabledSetpoints(false)
			_clearSetpoints()
			await updateProfile()
			await delayMs(20)
			await refreshProfile()
		}))

		measureButton.addEventListener('click', asyncEvent(async event => {
			if(this.#device === undefined) { return }

			await refreshMeasurement()
		}))





		// const root = document.createElement('boschieu-config')

		// const pollButton = document.createElement('button')
		// pollButton.textContent = 'Measure'
		// root.appendChild(pollButton)

		// const outputElem = document.createElement('output')
		// outputElem.textContent = 'no reading yet'
		// root.appendChild(outputElem)

		// pollButton.addEventListener('click', asyncEvent(async e => {
		// 	//
		// 	pollButton.disabled = true

		// 		//
		// 		if(this.#device === undefined) {
		// 			console.log('device is undefined')
		// 			return
		// 		}

		// 		console.log('perform measurement')
		// 		const measurement = await this.#device.measurement()
		// 		console.log(measurement)

		// 		const simpleTemperature = Math.round(measurement.temperature.C * 100) / 100
		// 		outputElem.textContent = `${simpleTemperature} C`

		// 		pollButton.disabled = false
		// }), { once: false })

		await Promise.all([
			refreshChip(),
			refreshProfile()
		])

		bindTabRoot(root)

    return root
  }
}