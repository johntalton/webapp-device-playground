import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS1841, LUT_BYTE_PER_ENTRY, LUT_BYTE_SIZE, LUT_TABLE_SIZE } from '@johntalton/ds1841'
import { range } from '../util/range.js'
import { delayMs} from '../util/delay.js'
import { asyncEvent } from '../util/async-event.js'
import { DOMTokenListLike } from '../util/dom-token-list.js'
import { bindTabRoot } from '../util/tabs.js'

// async function fetchOutputs(device) {
// 	const lutIndex = await device.getLUTIndex()
// 	const lutValue = await device.getLUTByIndex(lutIndex)
// 	const ivr = await device.getIVR()
// 	const temp = await device.getTemperature()
// 	const volt = await device.getVoltage()

// 	const { wiperAccessControl, lutIndexMode } = await device.getCR2()

// 	const controlFunctionality = (wiperAccessControl === ACCESS_CONTROL.MANUAL) ? 'WIPER'
// 			: (lutIndexMode === LUT_MODE.FROM_DIRECT_VALUE) ? 'LUTAR' : 'TEMP'

// 	return { temp, volt, ivr, lutIndex, lutValue, controlFunctionality }
// }

// async function updateOutputs({
// 	temp, volt, ivr, lutIndex, lutValue, controlFunctionality
// }) {
// 	const outputTemp = document.getElementById('outputTemp')
// 	const outputVoltage = document.getElementById('outputVoltage')
// 	const outputIVR = document.getElementById('outputIVR')
// 	const outputLUTIndex = document.getElementById('outputLUTIndex')
// 	const outputLUTValue = document.getElementById('outputLUTValue')
// 	const outputFunctionality = document.getElementById('outputFunctionality')

// 	outputTemp.innerText = temp
// 	outputVoltage.innerText = volt
// 	outputIVR.innerText = ivr
// 	outputLUTIndex.innerText = lutIndex
// 	outputLUTValue.innerText = lutValue
// 	outputFunctionality.innerText = controlFunctionality
// }

export class DS1841Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS1841Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address, {})
	}


	get title() { return 'DS1841' }

	async open() {
		this.#device = new DS1841(this.#abus)

		// await this.#device.setCR0({ mode: MODE.UPDATE_ONLY })
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/ds1841.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ds1841-config')
		if (root === null) { throw new Error('no root for template') }



		const configForm = root.querySelector('form[data-config]')
		const valuesForm = root.querySelector('form[data-values]')
		const lutForm = root.querySelector('form[data-lut]')

		const enableShadowSelect = configForm?.querySelector('select[name="enableShadowRegisters"]')
		const enableADCCheckbox = configForm?.querySelector('input[name="enableADC"]')
		const enableSumCheckbox = configForm?.querySelector('input[name="enableLUTSummation"]')
		const enableLUTAddrCheckbox = configForm?.querySelector('input[name="enableTemperatureUpdates"]')
		const enableLUTValueCheckbox = configForm?.querySelector('input[name="enableIndexUpdates"]')

		const ivrNumber = valuesForm?.querySelector('input[name="ivrValue"]')
		const ivrRange = valuesForm?.querySelector('input[name="ivrValueAlt"]')
		const lutValueNumber = valuesForm?.querySelector('input[name="lutValue"]')
		const lutValueRange = valuesForm?.querySelector('input[name="lutValueAlt"]')
		const lutIndexNumber = valuesForm?.querySelector('input[name="lutIndex"]')
		const temperatureOutput = valuesForm?.querySelector('output[name="temperature"]')
		const voltageOutput = valuesForm?.querySelector('output[name="voltage"]')

		const lutList = lutForm?.querySelector('ol[data-lut-list]')
		const lustListTemplate = lutList?.querySelector(':scope > template')

		const refreshButton = root.querySelector('button[data-refresh]')

		const tokens = new DOMTokenListLike(root.getAttributeNode('data-enable'))


		const revalidateValues = async => {
			const adc = tokens.contains('adc')
			const addr = adc && !tokens.contains('address')
			const value = adc && !tokens.contains('value')

			lutValueNumber.disabled = !value
			lutValueRange.disabled = !value

			lutIndexNumber.disabled = !addr

			temperatureOutput.disabled = !adc
			voltageOutput.disabled = !adc
		}


		const SHADOW_DELAY_MS = 20
		const  delayEEPROM = () => delayMs(SHADOW_DELAY_MS)

		const refreshLUTValue = async () => {
			// await delayMs(1000)
			const lutValue = await this.#device.getLUTValue()
			lutValueNumber.value = lutValue
			lutValueRange.value = lutValue
		}

		const refreshValues = async () => {
			const ivr = await this.#device.getIVR()
			const lutIndex = await this.#device.getLUTIndex()
			const lutValue = await this.#device.getLUTValue()
			const temperature = await this.#device.getTemperature()
			const voltage = await this.#device.getVoltage()


			const t = `${Math.trunc(temperature * 100.0) / 100.0} ℃`
			const v = `${Math.trunc(voltage / 1000.0 * 100.0) / 100.0} mV`

			ivrNumber.value = ivr
			ivrRange.value = ivr

			lutValueNumber.value = lutValue
			lutValueRange.value = lutValue

			lutIndexNumber.value = lutIndex

			temperatureOutput.value = t
			voltageOutput.value = v

			lutList?.querySelectorAll('li[data-active]').forEach(li => li.toggleAttribute('data-active', false))
			lutList?.querySelector(`li[data-index="${lutIndex}"]`)?.toggleAttribute('data-active', true)
		}

		const refreshControl0 = async () => {
			const {
				enableShadowEE
			} = await this.#device.getCR0()

			enableShadowSelect.value = enableShadowEE

			// implications
			tokens.toggle('shadow', enableShadowEE)
		}

		const refreshControl1 = async () => {
			const {
				enableSummation,
				enableADC
			} = await this.#device.getCR1()

			enableADCCheckbox.checked = enableADC
			enableSumCheckbox.checked = enableSummation

			// implications
			tokens.toggle('adc', enableADC)
			tokens.toggle('sum', enableSummation)
		}

		const refreshControl2 = async () => {
			const {
				enableLUTValueUpdate,
				enableLUTAddressUpdate
			} = await this.#device.getCR2()

			enableLUTAddrCheckbox.checked = enableLUTAddressUpdate
			enableLUTValueCheckbox.checked = enableLUTValueUpdate

			// implications
			tokens.toggle('address', enableLUTAddressUpdate)
			tokens.toggle('value', enableLUTValueUpdate)
		}

		const refreshControls = async () => {
			await refreshControl0()
			await refreshControl1()
			await refreshControl2()
		}


		function temperatureRangeForLUTIndex(index) {
			if(index === 0) { return [ -Infinity, -40 ] }
			if(index >= 71) { return [ 101, Infinity]}

			const temp = (index * 2) + -40
			return [ temp - 1, temp ]
		}


		const refreshLUTBulk = async () => {
			// as most i2c does not allow infinite reads, an upper bound
			// must be set, the LUT is 72 bytes, however, our current
			// but driver can only support upto 64 bytes.
			// Choosing a 'random' value here to make things work
			const SAFE_READ_SIZE = 24
			const maxCount = Math.floor(SAFE_READ_SIZE / LUT_BYTE_PER_ENTRY)

			for(const begin of range(0, LUT_TABLE_SIZE, maxCount)) {
				const size = Math.min(begin + maxCount, LUT_TABLE_SIZE) - begin
				if(size === 0) { break }

				const lut = await this.#device.getLUT(begin, size)

				lut.forEach((value, current) => {
					const index = begin + current

					const li = lutForm?.querySelector(`li[data-index="${index}"]`)
					const lutEntryNumber = li?.querySelector('input')
					const lutEntryLabel = li?.querySelector('label')

					const [low, high] = temperatureRangeForLUTIndex(index)

					lutEntryNumber.value = value
					lutEntryLabel.innerText = `${low} - ${high} ℃`
				})
			}
		}

		const refreshLUT = async (index) => {

		}



		configForm?.addEventListener('change', asyncEvent(async event => {
			const whatChanged = event.target.closest('[data-what]').getAttribute('data-what')

			if(whatChanged.includes('control0')) {
				await this.#device.setCR0({
					enableShadowEE: enableShadowSelect.value === 'true'
				})

				await delayEEPROM()

				await refreshControl0()
				await refreshControl1()
			}

			if(whatChanged.includes('control1')) {
				await this.#device.setCR1({
					enableADC: enableADCCheckbox.checked,
					enableSummation: enableSumCheckbox.checked
				})

				if(!tokens.contains('shadow')) {
					await delayEEPROM()
				}

				await refreshControl1()
			}

			if(whatChanged.includes('control2')) {
				await this.#device.setCR2({
					enableLUTAddressUpdate: enableLUTAddrCheckbox.checked,
					enableLUTValueUpdate: enableLUTValueCheckbox.checked
				})

				await refreshControl2()
			}

			await revalidateValues()
		}))


		ivrNumber?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			ivrNumber.disabled = true
			ivrRange.disabled = true

			ivrRange.value = ivrNumber.value

			await this.#device.setIVR(parseInt(ivrNumber.value))

			if(!tokens.contains('shadow')) {
				await delayEEPROM()
			}
			await refreshLUTValue()

			ivrNumber.disabled = false
			ivrRange.disabled = false
		}))

		ivrRange?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			ivrNumber.disabled = true
			ivrRange.disabled = true

			ivrNumber.value = ivrRange.value

			await this.#device.setIVR(parseInt(ivrRange.value))

			if(!tokens.contains('shadow')) {
				await delayEEPROM()
			}
			await refreshLUTValue()

			ivrNumber.disabled = false
			ivrRange.disabled = false
		}))

		lutValueNumber?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			lutValueNumber.disabled = true
			lutValueRange.disabled = true

			lutValueRange.value = lutValueNumber.value

			await this.#device.setLUTValue(parseInt(lutValueNumber.value))

			lutValueNumber.disabled = false
			lutValueRange.disabled = false
		}))

		lutValueRange?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			lutValueNumber.disabled = true
			lutValueRange.disabled = true

			lutValueNumber.value = lutValueRange.value

			await this.#device.setLUTValue(parseInt(lutValueRange.value))

			lutValueNumber.disabled = false
			lutValueRange.disabled = false
		}))

		lutIndexNumber?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			lutIndexNumber.disabled = true

			await this.#device.setLUTIndex(parseInt(lutIndexNumber.value))
			await refreshLUTValue()

			lutIndexNumber.disabled = false
		}))


		for(const lutIndex of range(0, LUT_TABLE_SIZE - 1)) {
			const liDoc = lustListTemplate.content.cloneNode(true)
			const li = liDoc.querySelector('li')

			li.setAttribute('data-index', lutIndex)

			lutList.append(li)

			const lutEntryNumber = li.querySelector('input')
			lutEntryNumber.addEventListener('change', asyncEvent(async event => {
				event.preventDefault()

				const value = parseInt(lutEntryNumber.value)
				await this.#device.setLUT(lutIndex, value)

			}))
		}

		refreshButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			refreshButton.disabled = true

			// await refreshControls()
			// await revalidateValues()

			await refreshValues()

			refreshButton.disabled = false
		}))


		bindTabRoot(root)

		await refreshControls()
		await refreshValues()
		await revalidateValues()
		await refreshLUTBulk()

		return root
	}
}

