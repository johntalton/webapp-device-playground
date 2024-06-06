import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { AW9523, DEFAULT, DEVICE_ID, INTERRUPT_ENABLE, INTERRUPT_DISABLE, MODE_LED, DIRECTION_OUTPUT } from '@johntalton/aw9523'
import { range } from '../util/range.js'
import { asyncEvent } from '../util/async-event.js'
import { bindTabRoot } from '../util/tabs.js'

export class AW9523Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new AW9523Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'AW9523 Gpio' }

	async open() {
		this.#device = await AW9523.from(this.#abus)

		const id = await this.#device.getId()
		if (id !== DEVICE_ID) { throw new Error('invalid device id') }
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/aw9523.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('aw9523-config')
		if (root === null) { throw new Error('no root for template') }

		const template = doc.querySelector('template[data-gpio]')

		const refreshInputs = inputs => {
			inputs.forEach((input, pin) => {
				const gpioOutput = root.querySelector(`output[name="gpioValue${pin}"]`)
				gpioOutput.value = input ? 'High' : 'Low'
			})
		}

		const refresh = async () => {
			const {
				id,
				port0PushPull,
				iMaxRange,
				mode
			} = await this.#device.getProfile()

			const {
				inputs, outputs, directions, interrupts
			} = await this.#device.getPorts()

			refreshInputs(inputs)

			const port0PushPullSelect = root.querySelector('select[name="port0PushPull"]')
			port0PushPullSelect.value = port0PushPull

			const imaxRangSelect = root.querySelector('select[name="iMaxRange"]')
			imaxRangSelect.value = iMaxRange

			mode.forEach((mode, pin) => {
				const pinDetails = root.querySelector(`details[data-gpio="${pin}"]`)
				const modeSelect = pinDetails?.querySelector('select[name="mode"]')
				modeSelect.value = mode

				const isDefault = mode === DEFAULT.MODE
				const modeLi = pinDetails?.querySelector('[data-summary-mode]')
				modeLi?.toggleAttribute('data-default', isDefault)
				modeLi.innerText = mode === MODE_LED ? 'Mode LED' : 'Mode GPIO'
			})

			outputs.forEach((output, pin) => {
				const pinDetails = root.querySelector(`details[data-gpio="${pin}"]`)
				const outputSelect = pinDetails?.querySelector('select[name="output"]')
				outputSelect.value = output
			})

			directions.forEach((direction, pin) => {
				const pinDetails = root.querySelector(`details[data-gpio="${pin}"]`)
				const directionSelect = pinDetails?.querySelector('select[name="direction"]')
				directionSelect.value = direction

				const isDefault = direction === DEFAULT.DIRECTION
				const directionLi = pinDetails?.querySelector('[data-summary-direction]')
				directionLi?.toggleAttribute('data-default', isDefault)
				directionLi.innerText = direction === DIRECTION_OUTPUT ? 'Output' : 'Input'
			})

			interrupts.forEach((interrupt, pin) => {
				const pinDetails = root.querySelector(`details[data-gpio="${pin}"]`)
				const interruptSelect = pinDetails?.querySelector('select[name="interrupt"]')
				interruptSelect.value = interrupt

				const isDefault = (interrupt ? INTERRUPT_ENABLE : INTERRUPT_DISABLE) === DEFAULT.INTERRUPT
				const interruptLi = pinDetails?.querySelector('[data-summary-interrupt]')
				interruptLi?.toggleAttribute('data-default', isDefault)
				interruptLi.innerText = interrupt ? 'Interrupt Enabled' : 'Interrupt Disabled'

			})
		}

		const profileForm = root.querySelector('form[data-profile]')
		profileForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			const port0Select = profileForm.querySelector('select[name="port0PushPull"]')
			const iMaxRangeSelect = profileForm.querySelector('select[name="iMaxRange"]')

			await this.#device.setControl({
				port0PushPull: port0Select.value === 'true',
				iMaxRange: parseInt(iMaxRangeSelect.value)
			})
		}))

		const form0 = root.querySelector('form[data-port0]')
		const form1 = root.querySelector('form[data-port1]')
		for (var pin of range(0, 15)) {
			const item = template.content.cloneNode(true)

			const port = (pin < 8) ? 0 : 1
			const portPin = (port === 1) ? pin - 8 : pin

			const details = item.querySelector('details')
			details.setAttribute('name', `accordionGroup-port-${port}`)
			details.setAttribute('data-gpio', pin)
			item.querySelector('summary > [data-summary-key]').innerText = `Gpio ${portPin}`

			const form = (port === 0) ? form0 : form1
			form?.appendChild(item)
		}

		for (const { port, form } of [ { port: 0, form: form0 }, { port: 1, form: form1 } ]) {
			const dimmingSliders = form?.querySelectorAll('input[name="dimming"]')

			form?.addEventListener('change', asyncEvent(async event => {
				event.preventDefault()

				const whatChanged = event.target.getAttribute('name')

				const formData = new FormData(form)

				const modes = formData.getAll('mode')
				const directions = formData.getAll('direction')
				const outputs = formData.getAll('output')
				const dimmings = formData.getAll('dimming')
				const interrupts = formData.getAll('interrupt')

				if(whatChanged === 'dimming') {
					const detailsElem = event.target.closest('details[data-gpio]')
					const gpioStr = detailsElem.getAttribute('data-gpio')
					const gpio = parseInt(gpioStr)
					const pin = (gpio >= 8) ? gpio - 8 : gpio
					const value = parseInt(event.target.value)

					await this.#device.setDimming(port, pin, value)
				}
				else {
					await this.#device.setMode(port, modes.map(m => parseInt(m)))
					await this.#device.setInterrupt(port, interrupts.map(i => i === 'true'))
					await this.#device.setDirection(port, directions.map(d => parseInt(d)))
					await this.#device.setOutput(port, outputs.map(o => o === 'true'))
				}


				await refresh()
			}))

			dimmingSliders?.forEach(dimmingSlider => {
				const detailsElem = dimmingSlider.closest('details[data-gpio]')
				const gpioStr = detailsElem.getAttribute('data-gpio')
				const gpio = parseInt(gpioStr)
				const pin = (gpio >= 8) ? gpio - 8 : gpio

				let future = undefined
				let target = 0

				dimmingSlider?.addEventListener('input', event => {
					//console.log('fast slider')

					target = parseInt(event.target.value)

					if(future) { return }

					future = this.#device.setDimming(port, pin, target)
					future.finally(() => { future = undefined })
				})
			})
		}

		const resetButton = root.querySelector('button[data-reset]')
		resetButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.reset()

			await refresh()
		}))

		const refreshButton = root.querySelector('button[data-refresh]')
		refreshButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			const input0 = await this.#device.getInput(0)
			const input1 = await this.#device.getInput(1)

			const input01 = [ ...input0.input, ...input1.input ]
			refreshInputs(input01)
		}))


		bindTabRoot(root)

		await refresh()

		// setInterval(async () => {
		// 	const inputs = await this.#device.getInput(1)
		// 	console.log(inputs.input)
		// }, 1000 * 1)

		return root
	}
}