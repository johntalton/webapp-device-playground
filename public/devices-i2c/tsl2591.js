import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { TSL2591, DEVICE_ID, GAIN_MODE_HIGH } from '@johntalton/tsl2591'
import { asyncEvent } from '../util/async-event.js'

export class TSL2591Builder {
	#abus

	/** @type {TSL2591} */
	#device

	static async builder(definition, ui) {
		return new TSL2591Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'TSL2591 (Light Sensor)' }

	async open() {
		this.#device = TSL2591.from(this.#abus)

		const id = await this.#device.getDeviceID()
		const ok = id === DEVICE_ID

		if(!ok) { throw new Error(`invalid device Id: ${id}`) }
	}

	async close() { }

	signature() { }


	async buildCustomView(selectionElem) {
		// const ff = document.createElement('fencedframe')
		// const ff = document.createElement('iframe')
		// ff.setAttribute('src', './custom-elements/tsl2591.html')
		// ff.setAttribute('height', '90%')
		// ff.setAttribute('width', '90%')
		// return ff

		// fetch template
		const response = await fetch('./custom-elements/tsl2591.html')
		if(!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('tsl2591-config')
		if(root === null) { throw new Error('no root for template')}



		async function _refresh(device) {
			const profile = await device.getProfile()
			const thresholds = await device.getThresholds()
			const status = await device.getStatus()
			const deviceId = await device.getDeviceID()

			const {
				noPersistInterruptEnabled,
				interruptEnabled,
				sleepAfterInterrupt,
				enabled,
				powerOn,

				gain,
				time
			} = profile

			const check = (name, value) => { root.querySelector(`input[name="${name}"]`).checked = value }

			check('enableNoPersistInterrupt', noPersistInterruptEnabled)
			check('enableInterrupt', interruptEnabled)
			check('enableSleepAfterInterrupt', sleepAfterInterrupt)
			check('enabled', enabled)
			check('powerOn', powerOn)

			const gainSelect = root?.querySelector('select[name="gain"]')
			gainSelect.value = gain

			const timeSelect = root?.querySelector('select[name="time"]')
			timeSelect.value = time

			const {
				interruptLow,
				interruptHigh,
				noPersistInterruptLow,
				noPersistInterruptHigh,
				persist
			} = thresholds

			root.querySelector('input[name="interruptThresholdLow"]').value = interruptLow
			root.querySelector('input[name="interruptThresholdHigh"]').value = interruptHigh

			root.querySelector('select[name="persist"]').value = persist

			root.querySelector('input[name="nePersistInterruptThresholdLow"]').value = noPersistInterruptLow
			root.querySelector('input[name="noPersistInterruptThresholdHigh"]').value = noPersistInterruptHigh

			const {
				noPersistInterruptFlag,
				interruptFlag,
				valid
			} = status

			const ok = deviceId === DEVICE_ID
			const deviceIdOutput = root?.querySelector('output[name="deviceID"]')
			deviceIdOutput.value = `${deviceId} ${ok ? '' : '🛑'}`

			const noPersistInterruptOutput = root?.querySelector('output[name="noPersistInterruptFlag"]')
			noPersistInterruptOutput.value = noPersistInterruptFlag ? '🔔 (true)' : '🔕'

			const interruptOutput = root?.querySelector('output[name="interruptFlag"]')
			interruptOutput.value = interruptFlag ? '🔔 (true)' : '🔕'

			const validOutput = root?.querySelector('output[name="valid"]')
			validOutput.value = valid ? '👍' : '👎 (false)'

		}

		const refresh = (all) => _refresh(this.#device)

		const statusButton = root.querySelector('form button[data-refresh-status]')
		statusButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			statusButton.disabled = true

			await refresh()

			statusButton.disabled = false
		}))

		const clearButton = root.querySelector('form button[data-clear-interrupt]')
		clearButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			// console.log(event.shiftKey)

			await this.#device.clearInterrupt(true, true)

			await refresh()
		}))

		const triggerButton = root.querySelector('form button[data-trigger-interrupt]')
		triggerButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.triggerInterrupt()

			await refresh()
		}))

		const resetButton = root.querySelector('form button[data-reset]')
		resetButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.reset()

			await refresh()
		}))

		const setThresholdButton = root.querySelector('form button[data-set-threshold]')
		setThresholdButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.setThreshold({
				interruptLow: root.querySelector('input[name="interruptThresholdLow"]')?.value,
				interruptHigh: root.querySelector('input[name="interruptThresholdHigh"]')?.value,

				persist: root?.querySelector('select[name="persist"]')?.value,

				noPersistInterruptLow: root.querySelector('input[name="nePersistInterruptThresholdLow"]')?.value,
				noPersistInterruptHigh: root.querySelector('input[name="noPersistInterruptThresholdHigh"]')?.value,
			})

			await refresh()
		}))



		const profileForm = root.querySelector('form[data-config]')
		profileForm?.addEventListener('change', asyncEvent(async event => {
			const enableNoPersistInterruptCheckbox = root.querySelector('input[name="enableNoPersistInterrupt"]')
			const enableInterruptCheckbox = root.querySelector('input[name="enableInterrupt"]')
			const enableSleepAfterInterruptCheckbox = root.querySelector('input[name="enableSleepAfterInterrupt"]')
			const enabledCheckbox = root.querySelector('input[name="enabled"]')
			const powerOnCheckbox = root.querySelector('input[name="powerOn"]')
			const gainSelect = root.querySelector('select[name="gain"]')
			const timeSelect = root.querySelector('select[name="time"]')

			await this.#device.setProfile({
				enableNoPersistInterrupt: enableNoPersistInterruptCheckbox.checked,
				enableInterrupt: enableInterruptCheckbox.checked,
				enableSleepAfterInterrupt: enableSleepAfterInterruptCheckbox.checked,
				enabled: enabledCheckbox.checked,
				powerOn: powerOnCheckbox.checked,
				gain: gainSelect.value,
				time : timeSelect.value
			})

			await refresh()
		}))

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



		const dataTab = root.querySelector('button[data-tab="data"]')
		const dataPollObserver = new MutationObserver((mutationList, observer) => {
			const latestMutation = mutationList[mutationList.length - 1]

			const activate = latestMutation.target.hasAttribute('data-active')

			console.log(activate ? 'start Data watch' : 'end Data watch')
		})
		dataPollObserver.observe(dataTab, { attributes: true, attributeFilter: [ 'data-active'] })


		const hoursCanvas = root.querySelector('canvas[data-hours]')
		const minutesCanvas = root.querySelector('canvas[data-minutes]')
		const secondsCanvas = root.querySelector('canvas[data-seconds]')

		const config  = {
			colors: {},
			hours: {
				height: hoursCanvas.height,
				width: hoursCanvas.width,
				canvas: hoursCanvas,
				context: hoursCanvas.getContext('2d', { colorSpace: 'display-p3' })
			},
			minutes: {
				height: minutesCanvas.height,
				width: minutesCanvas.width,
				canvas: minutesCanvas,
				context: minutesCanvas.getContext('2d', { colorSpace: 'display-p3' })
			},
			seconds: {
				height: secondsCanvas.height,
				width: secondsCanvas.width,
				canvas: secondsCanvas,
				context: secondsCanvas.getContext('2d', { colorSpace: 'display-p3' })
			}

		}


		// setInterval(async () => {
		// 	const data = await this.#device.getColor()

		// 	const foo = root.querySelector('[data-for-tab="data"]')
		// 	foo.innerText = JSON.stringify(data)
		// }, 1000)

		function renderGraph(options) {
			const { canvas, context, width, height } = options

			const computedStyle = window.getComputedStyle(canvas)
			const current = computedStyle.getPropertyValue('--color-accent')
			const colors = {
				current
			}

			context.clearRect(0, 0, width, height)

			context.strokeStyle = colors.current
			context.lineWidth = 2

			context.moveTo(10, 10)
			context.lineTo(100, 100)

			context.stroke()
		}

		function render() {
			renderGraph(config.hours)
			renderGraph(config.minutes)
			renderGraph(config.seconds)

			requestAnimationFrame(render)
		}

		requestAnimationFrame(render)

		await refresh()

		return doc.body.children[0]
	}
}
