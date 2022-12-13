import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { DS1841, MODE, ADC, ADDITION_MODE, ACCESS_CONTROL, LUT_MODE } from '@johntalton/ds1841'


async function fetchOutputs(device) {
	const lutIndex = await device.getLUTIndex()
	const lutValue = await device.getLUTByIndex(lutIndex)
	const ivr = await device.getIVR()
	const temp = await device.getTemperature()
	const volt = await device.getVoltage()

	const { wiperAccessControl, lutIndexMode } = await device.getCR2()

	const controlFunctionality = (wiperAccessControl === ACCESS_CONTROL.MANUAL) ? 'WIPER'
			: (lutIndexMode === LUT_MODE.FROM_DIRECT_VALUE) ? 'LUTAR' : 'TEMP'

	return { temp, volt, ivr, lutIndex, lutValue, controlFunctionality }
}

async function updateOutputs({
	temp, volt, ivr, lutIndex, lutValue, controlFunctionality
}) {
	const outputTemp = document.getElementById('outputTemp')
	const outputVoltage = document.getElementById('outputVoltage')
	const outputIVR = document.getElementById('outputIVR')
	const outputLUTIndex = document.getElementById('outputLUTIndex')
	const outputLUTValue = document.getElementById('outputLUTValue')
	const outputFunctionality = document.getElementById('outputFunctionality')

	outputTemp.innerText = temp
	outputVoltage.innerText = volt
	outputIVR.innerText = ivr
	outputLUTIndex.innerText = lutIndex
	outputLUTValue.innerText = lutValue
	outputFunctionality.innerText = controlFunctionality
}

export class DS1841Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new DS1841Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'DS1841' }

	async open() {
		this.#device = new DS1841(this.#abus)

		// await this.#device.setCR0({ mode: MODE.UPDATE_ONLY })
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('ds1841-config')

		root.addEventListener('change', e => {

			if(e.target.id === 'wiperSlider') {
				e.target.disabled = true


				return
			}

			const updateModeNVRAM = e.target.id === 'updateNVRAMMode'

			if(updateModeNVRAM || e.target.id === 'updateOnlyMode') {

				const group = document.getElementById('updateModeGroup')
				group.disabled = true

				const mode = updateModeNVRAM ? MODE.SET_AND_UPDATE : MODE.UPDATE_ONLY

				console.log('set mode', mode)

				this.#device.setCR0({ mode })
					.then(() => {
						group.disabled = false
					})
					.catch(e => console.log(e))

				return
			}

			if(e.target.id === 'enableADC') {
				const sumElem = document.getElementById('enableSummation')
				const controlsGroup = document.getElementById('functionalityControl')


				console.log(e, e.target.checked)
				const enableControlsOnSuccess = e.target.checked
				controlsGroup.disabled = true

				e.target.disabled = true

				const additionMode = sumElem.checked ? ADDITION_MODE.SUMMED : ADDITION_MODE.DIRECT
				const updateMode = e.target.checked ? ADC.ON : ADC.OFF

				this.#device.setCR1({
					updateMode,
					additionMode
				})
					.then(() => {
						console.log('cr1 updated', enableControlsOnSuccess)
						controlsGroup.disabled = !enableControlsOnSuccess
						e.target.disabled = false
					})
					.catch(e => console.log(e))

				return
			}


			if(e.target.name === 'controlFunctionalityGroup') {
				const group = document.getElementById('functionalityControl')

				const selected = document.querySelector('input[name="controlFunctionalityGroup"]:checked')

				group.disabled = true

				const wiperAccessControl = (selected.value === 'WIPER') ? ACCESS_CONTROL.MANUAL : ACCESS_CONTROL.ADC_CONTROL
				const lutIndexMode = (selected.value === 'LUTAR') ? LUT_MODE.FROM_DIRECT_VALUE : LUT_MODE.FROM_ADC_TEMPERATURE

				this.#device.setCR2({
					wiperAccessControl,
					lutIndexMode
				})
					.then(() => {
						group.disabled = false
					})
					.then(() => fetchOutputs(this.#device))
					.then(updateOutputs)
					.catch(e => console.log(e))


				return
			}

			if(e.target.id.startsWith('lutValueIndex')) {
				const value = parseInt(e.target.value, 10)
				const lutIndex = parseInt(e.target.getAttribute('data-index'), 10)

				console.log('set lut index', lutIndex, value)
				this.#device.setLUTByIndex(lutIndex, value)
					.then(() => {
						console.log('lut index set')
					})
					.catch(e => console.log(e))

				return
			}


			console.warn('change unhandled', e)

		}, {})


		// await this.#device.setIVR(3)
		const wiper = await this.#device.getWIPER()

		const { mode } = await this.#device.getCR0()
		const { updateMode, additionMode } = await this.#device.getCR1()

		const {
			temp, volt, ivr, lutIndex, lutValue, controlFunctionality
		} = await fetchOutputs(this.#device)

		const lut = await this.#device.getLUT()




		const template = `

			<fieldset>
				<label for="outputTemp">Temperature C:</label>
				<output id="outputTemp">${temp}</output>

				<label for="outputVoltage">Voltage mV:</label>
				<output id="outputVoltage">${volt}</output>

				<label for="outputIVR">IVR:</label>
				<output id="outputIVR">${ivr}</output>

				<label for="outputLUTIndex">LUT Index:</label>
				<output id="outputLUTIndex">${lutIndex}</output>

				<label for="outputLUTValue">LUT Value:</label>
				<output id="outputLUTValue">${lutValue}</output>

				<label for="outputWiper">Wiper:</label>
				<output id="outputWiper">${wiper}</output>

				<label for="outputFunctionality">Functionality:</label>
				<output id="outputFunctionality">${controlFunctionality}</output>
			</fieldset>

			<fieldset id="updateModeGroup">
				<legend>Mode</legend>

				<label for="updateNVRAMMode">Update NVRAM and update Wiper (default)</label>
				<input id="updateNVRAMMode" type="radio" name="updateModeGroup" ${((mode === MODE.SET_AND_UPDATE) ? 'checked' : '')} />

				<label for="updateOnlyMode">Update Wiper only</label>
				<input id="updateOnlyMode" type="radio" name="updateModeGroup" ${((mode === MODE.UPDATE_ONLY) ? 'checked' : '')} />
			</fieldset>

			<fieldset>
				<legend></legend>

				<label for="enableADC">Enable ADC</label>
				<input id="enableADC" type="checkbox" ${updateMode === ADC.ON ? 'checked' : ''} />
			</fieldset>

			<fieldset id="functionalityControl" ${updateMode === ADC.ON ? '' : 'disabled'}>
				<legend></legend>

				<label for="enableSummation">Enable Output Summation</label>
				<input id="enableSummation" type="checkbox" ${additionMode === ADDITION_MODE.SUMMED ? 'checked' : ''} />


				<label for="functionalityTemperatureControl">Temperature Controlled</label>
				<input id="functionalityTemperatureControl" type="radio" name="controlFunctionalityGroup" value="TEMP" ${controlFunctionality === 'TEMP' ? 'checked' : ''} />

				<label for="functionalityWiperControl">Direct Wiper Controlled</label>
				<input id="functionalityWiperControl" type="radio" name="controlFunctionalityGroup" value="WIPER" ${controlFunctionality === 'WIPER' ? 'checked' : ''} />

				<label for="functionalityLUTARControl">Direct LUTAR Controlled</label>
				<input id="functionalityLUTARControl" type="radio" name="controlFunctionalityGroup" value="LUTAR" ${controlFunctionality === 'LUTAR' ? 'checked' : ''} />

			</fieldset>

			<fieldset>
				<legend></legend>

				<label for="directLUTARValue">Direct LUTAR</label>
				<input id="directLUTARValue" ${controlFunctionality !== 'LUTAR' ? 'disabled' : ''} type="number" />

				<label for="directWiperValue">Direct WIPER</label>
				<input id="directWiperValue" ${controlFunctionality !== 'WIPER' ? 'disabled' : ''} type="number" />
			</fieldset>


			<fieldset>
				<legend></legend>

				<label for="wiperSlider">Manual Wiper</label>
				<input id="wiperSlider" type="range" />
			</fieldset>

			<ol>
				${Object.entries(lut).map(([key, value]) => {
					const index = parseInt(key, 10)
					const selected = lutIndex === index

					const from = (index * 2 - 1) - 40
					const to = from + 1

					return `
						<li>
							<label for="lutValueIndex-${index}">(${from} - ${to}) ${selected ? ' * ' : ''}</label>
							<input id="lutValueIndex-${index}" data-index="${index}" type="number" value="${value}" />
						</li>
						`
				}).join('')}
			</ol>
			`

		root.innerHTML = template

		return root
	}
}

