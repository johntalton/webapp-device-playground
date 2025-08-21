import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { TSL2591, DEVICE_ID, GAIN_MODE_HIGH } from '@johntalton/tsl2591'
import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'
import { delayMs } from '../util/delay.js'
import { bindTabRoot } from '../util/tabs.js'
import { DOMTokenListLike } from '../util/dom-token-list.js'

export class TSL2591Builder {
	#abus

	/** @type {TSL2591} */
	#device

	#config
	#closeController = new AbortController()

	static async builder(definition, ui) {
		return new TSL2591Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address, { reuse: false })
	}


	get title() { return 'TSL2591 (Light Sensor)' }

	async open() {
		this.#device = TSL2591.from(this.#abus)

		const id = await this.#device.getDeviceID()
		const ok = id === DEVICE_ID

		if(!ok) { throw new Error(`invalid device Id: ${id}`) }
	}

	async close() {
		this.#closeController.abort('Close')
	}

	signature() { }

	async buildCustomView(selectionElem) {
		/**
		 * @template T
		 * @param {string} query
		 * @param {new (...args: any[]) => T} type
		 * @returns {T}
		 */
		function elem(root, query, type) {
			const element = root?.querySelector(query)
			if(element === null) { throw new Error('missing element') }
			if(!(element instanceof type)) { throw new Error('type miss-match') }
			return element
		}

		// fetch template
		const response = await fetch('./custom-elements/tsl2591.html')
		if(!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('tsl2591-config')
		if(root === null) { throw new Error('no root for template')}

		// profile
		const gainSelect = elem(root, 'select[name="gain"]', HTMLSelectElement)
		const timeSelect = elem(root, 'select[name="time"]', HTMLSelectElement)
		const enableNoPersistInterruptCheckbox = elem(root, 'input[name="enableNoPersistInterrupt"]', HTMLInputElement)
		const enableInterruptCheckbox = elem(root, 'input[name="enableInterrupt"]', HTMLInputElement)
		const enableSleepAfterInterruptCheckbox = elem(root, 'input[name="enableSleepAfterInterrupt"]', HTMLInputElement)
		const enabledCheckbox = elem(root, 'input[name="enabled"]', HTMLInputElement)
		const powerOnCheckbox = elem(root, 'input[name="powerOn"]', HTMLInputElement)


		// status
		const noPersistInterruptOutput = elem(root, 'output[name="noPersistInterruptFlag"]', HTMLOutputElement)
		const interruptOutput = elem(root, 'output[name="interruptFlag"]', HTMLOutputElement)
		const validOutput = elem(root, 'output[name="valid"]', HTMLOutputElement)

		// deviceID
		const deviceIdOutput = elem(root, 'output[name="deviceID"]', HTMLOutputElement)

		// threshold
		const thresholdInterruptLowNumber = elem(root, 'input[name="interruptThresholdLow"]', HTMLInputElement)
		const thresholdInterruptHighNumber = elem(root, 'input[name="interruptThresholdHigh"]', HTMLInputElement)
		const thresholdInterruptPersistSelect = elem(root, 'select[name="persist"]', HTMLSelectElement)
		const thresholdNoPersistLowNumber = elem(root, 'input[name="nePersistInterruptThresholdLow"]', HTMLInputElement)
		const thresholdNoPersistHighNumber = elem(root, 'input[name="noPersistInterruptThresholdHigh"]', HTMLInputElement)


		const refreshStatus = async () => {
			const {
				noPersistInterruptFlag,
				interruptFlag,
				valid
			} = await this.#device.getStatus()

			noPersistInterruptOutput.value = noPersistInterruptFlag ? '🔔 (true)' : '🔕'
			interruptOutput.value = interruptFlag ? '🔔 (true)' : '🔕'
			validOutput.value = valid ? '👍' : '👎 (false)'
		}

		const refreshDeviceId = async () => {
			const deviceId = await this.#device.getDeviceID()

			const ok = deviceId === DEVICE_ID
			deviceIdOutput.value = `0x${deviceId.toString(16).padStart(2, '0')} ${ok ? '' : '🛑'}`
		}

		const refreshThreshold = async () => {
			const {
				interruptLow,
				interruptHigh,
				noPersistInterruptLow,
				noPersistInterruptHigh,
				persist
			} = await this.#device.getThresholds()

			thresholdInterruptLowNumber.value = interruptLow.toString()
			thresholdInterruptHighNumber.value = interruptHigh.toString()
			thresholdInterruptPersistSelect.value = persist.toString()
			thresholdNoPersistLowNumber.value = noPersistInterruptLow.toString()
			thresholdNoPersistHighNumber.value = noPersistInterruptHigh.toString()

			this.#config.ch0.threshold.high = interruptHigh
			this.#config.ch0.threshold.low = interruptLow
			this.#config.ch0.noPersistThreshold.high = noPersistInterruptHigh
			this.#config.ch0.noPersistThreshold.low = noPersistInterruptLow
		}

		const refreshProfile = async () => {
			const {
				noPersistInterruptEnabled,
				interruptEnabled,
				sleepAfterInterrupt,
				enabled,
				powerOn,
				gain,
				time
			} = await this.#device.getProfile()

			enableNoPersistInterruptCheckbox.checked = noPersistInterruptEnabled
			enableInterruptCheckbox.checked = interruptEnabled
			enableSleepAfterInterruptCheckbox.checked = sleepAfterInterrupt
			enabledCheckbox.checked = enabled
			powerOnCheckbox.checked = powerOn
			gainSelect.value = gain.toString()
			timeSelect.value = time.toString()
		}

		const refreshAll = async () => {
			await refreshDeviceId()
			await refreshProfile()
			await refreshThreshold()
			await refreshStatus()
		}



		const statusButton = elem(root, 'form button[data-refresh-status]', HTMLButtonElement)
		statusButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			statusButton.disabled = true

			await refreshStatus()

			statusButton.disabled = false
		}))

		const handleCommonClear = async event => {
			event.preventDefault()

			const { target } = event
			const dtl = new DOMTokenListLike(target.getAttributeNode('data-clear-interrupt'))

			// console.log(event.shiftKey)

			const clearNonPersist = dtl.contains('noPersist')
			const clearPersist = dtl.contains('persist')

			if(!clearNonPersist && !clearPersist) {
				console.warn('Not set to Clear either, skip')
				return
			}

			await this.#device.clearInterrupt(clearNonPersist, clearPersist)

			await refreshStatus()
		}

		const clearButtons = root.querySelectorAll('form button[data-clear-interrupt]')
		clearButtons.forEach(clearButton => clearButton.addEventListener('click', handleCommonClear))

		const triggerButton = elem(root, 'form button[data-trigger-interrupt]', HTMLButtonElement)
		triggerButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.triggerInterrupt()

			await refreshStatus()
		}))

		const resetButton = elem(root, 'form button[data-reset]', HTMLButtonElement)
		resetButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.reset()

			await refreshAll()
		}))

		const setThresholdButton = elem(root, 'form button[data-set-threshold]', HTMLButtonElement)
		setThresholdButton.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.setThreshold({
				interruptLow: parseInt(thresholdInterruptLowNumber.value),
				interruptHigh: parseInt(thresholdInterruptHighNumber.value),

				persist: parseInt(thresholdInterruptPersistSelect.value),

				noPersistInterruptLow: parseInt(thresholdNoPersistLowNumber.value),
				noPersistInterruptHigh: parseInt(thresholdNoPersistHighNumber.value),
			})

			await refreshThreshold()
			await refreshStatus()
		}))

		const profileForm = elem(root, 'form[data-config]', HTMLFormElement)
		profileForm.addEventListener('change', asyncEvent(async event => {
			await this.#device.setProfile({
				enableNoPersistInterrupt: enableNoPersistInterruptCheckbox.checked,
				enableInterrupt: enableInterruptCheckbox.checked,
				enableSleepAfterInterrupt: enableSleepAfterInterruptCheckbox.checked,
				enabled: enabledCheckbox.checked,
				powerOn: powerOnCheckbox.checked,
				gain: parseInt(gainSelect.value),
				time: parseInt(timeSelect.value)
			})

			await refreshProfile()
		}))

		const startDataButton = elem(root, 'button[command="--start-data"]', HTMLButtonElement)
		const stopDataButton = elem(root, 'button[command="--stop-data"]', HTMLButtonElement)
		startDataButton.addEventListener('click', event => {

			const controller = new AbortController()
			const signal = AbortSignal.any([ controller.signal, this.#closeController.signal ]) // AbortSignal.timeout(1000 * 10)
			signal.addEventListener('abort', () => {
				this.#config.paused = true
			})

			this.#config.paused = false
			acquireData(signal)
				.catch(e => {
					console.log('acquireData error', e)
					controller.abort('Acquire Error') // not needed?
					this.#config.paused = true
				})
				.finally(() => {
					startDataButton.disabled = false
					stopDataButton.disabled = true
				})

			startDataButton.disabled = true
			stopDataButton.disabled = false

			stopDataButton.addEventListener('click', event => {
				controller.abort('Stop')
				stopDataButton.disabled = true
			}, { once: true })

			requestAnimationFrame(render)
		})

		//
		bindTabRoot(root)



		// const dataTab = root.querySelector('button[data-tab="data"]')
		// const dataPollObserver = new MutationObserver((mutationList, observer) => {
		// 	const latestMutation = mutationList[mutationList.length - 1]

		// 	const activate = latestMutation.target.hasAttribute('data-active')

		// 	console.log(activate ? 'start Data watch' : 'end Data watch')
		// })
		// dataPollObserver.observe(dataTab, { attributes: true, attributeFilter: [ 'data-active'] })


		const ch0Canvas = elem(root, 'canvas[data-ch0]', HTMLCanvasElement)
		const ch1Canvas = elem(root, 'canvas[data-ch1]', HTMLCanvasElement)

		const DEFAULT_ITEM =  {
			sum: 0,
			total: 0,
			time: 0,
			min: Infinity,
			max: -Infinity,
			avg: 0
		}

		this.#config  = {
			paused: false,
			colors: {},
			ch0: {
				label: 'Ch 0',
				height: ch0Canvas.height,
				width: ch0Canvas.width,
				canvas: ch0Canvas,
				context: ch0Canvas.getContext('2d', { colorSpace: 'display-p3' }),
				buckets: [...range(0, 60)].map(i => ({...DEFAULT_ITEM })),
				max: 100,
				targetMax: 100,
				threshold: {},
				noPersistThreshold: {}
			},
			ch1: {
				label: 'Ch 1',
				height: ch1Canvas.height,
				width: ch1Canvas.width,
				canvas: ch1Canvas,
				context: ch1Canvas.getContext('2d', { colorSpace: 'display-p3' }),
				buckets: [...range(0, 60)].map(i => ({ ...DEFAULT_ITEM })),
				max: 100,
				targetMax: 100,
			}
		}

		function _makePattern(rootContext) {
			const osc = new OffscreenCanvas(10, 10)
			const context = osc.getContext('2d')
			if(context === null) { throw new Error('unable to create context') }

			context.fillStyle = 'transparent'
			context.fillRect(0, 0, 10, 10)
			context.strokeStyle = 'grey'
			context.beginPath()
			context.moveTo(0, 0)
			context.lineTo(10, 10)
			context.stroke()

			return rootContext.createPattern(osc, 'repeat')
		}

		this.#config.ch0.pattern = _makePattern(this.#config.ch0.context)
		this.#config.ch1.pattern = _makePattern(this.#config.ch1.context)


		async function* colors(device, signal) {
			while(true) {
				if(signal.aborted) {
					console.log('break', signal.reason)
					break
				}

				yield device.getColor()
			}
		}

		function updateItem(item, index, value) {
			const bucket = item.buckets[index]

			bucket.sum = bucket.sum + value
			bucket.total = bucket.total + 1
			bucket.max = Math.max(bucket.max, value)
			bucket.min = Math.min(bucket.min, value)
			bucket.avg = bucket.sum / bucket.total

			// avg Avg
			const workingSet = item.buckets.filter(item => item.total > 1)
			const avgAvg = workingSet.reduce((acc, item) => acc + item.avg, 0) / workingSet.length

			const deltaOfMax = Math.abs(item.targetMax - item.max)
			const step = deltaOfMax * 0.5

			// new target max
			item.targetMax = avgAvg * 1.5

			if(step > 1) {
				item.max += (item.max > item.targetMax) ? -step : step
			}
		}

		const acquireData = (signal) => {
			return Promise.resolve()
				.then(async () => {

					for await (const { ch0, ch1 } of colors(this.#device, signal)) {
						await delayMs(1000 / 10)

						const now = Date.now()
						const index = Math.floor(now / 1000) % 60
						// console.log(now, index, ch0, ch1)

						const config = this.#config

						if((now - config.ch0.buckets[index].time) > (1 * 1000)) {
							// console.log('clear')
							config.ch0.buckets[index] = { ...DEFAULT_ITEM, time: now }
							config.ch1.buckets[index] = { ...DEFAULT_ITEM, time: now }
						}

						updateItem(config.ch0, index, ch0)
						updateItem(config.ch1, index, ch1)

					}
				})
		}

		function _renderThresholdLine(context, value, options, colors) {
			const { name, max, width, height, color } = options

			const outOfBoundsTop = value > max
			const y = outOfBoundsTop ? 0 : height - (height * value / max)

			context.strokeStyle = color
			context.setLineDash(outOfBoundsTop ? [5, 5] : [])

			context.beginPath()
			context.moveTo(0, y)
			context.lineTo(width, y)
			context.stroke()

			const text = `${name}: ${Math.trunc(value)}`
			const metric = context.measureText(text)

			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(text, width - metric.width - 10, Math.min(height - 30, Math.max(30, Math.floor(y) - 5)) )
		}





		function renderGraph(options) {
			const {
				canvas,
				context,
				width,
				height,
				buckets,
				max,
				targetMax,
				threshold,
				noPersistThreshold,
				label,
				pattern
			} = options

			const barWidth = width / (60 - 1)

			const computedStyle = window.getComputedStyle(canvas)
			const current = computedStyle.getPropertyValue('--color-accent')
			const text = computedStyle.getPropertyValue('color')
			const family = computedStyle.getPropertyValue('font-family')
			const size = computedStyle.getPropertyValue('font-size')
			const colors = {
				current,
				text,
				font: `${size} ${family}`
			}

			const fontHeight = parseInt(context.font.split(' ')[0].replace('px', ''), 10)


			context.clearRect(0, 0, width, height)

			const now = Date.now()
			const index = Math.floor(now / 1000) % 60
			const nudge = ((now % 1000) / 1000) * barWidth

			for(const offset of range(0, 60 - 1)) {
				// 1min ago ...   now
				// 0 1 2 3 ... 59
				// index 18th second
				// 19 ... 58 59 60 61 ... 77
				// 19 ... 58 59 0 ... 18
				const bucketIndex = (index + 1 + offset) % 60

				const subNow = Date.now()
				const expired = ((subNow - buckets[bucketIndex].time) >= (59 * 1000))


				const left = offset * barWidth - nudge

				if(expired) {
					context.fillStyle = pattern
					context.fillRect(left - 1, 0, barWidth + 1, height)
					continue
				}

				// const last = (offset === (60 - 1))

				const { avg, max: biMax, min: biMin } = buckets[bucketIndex]
				const barHeight = height * (avg / max)

				const top = height - barHeight

				context.fillStyle = expired ? 'magenta' : colors.current
				context.fillRect(left - 1, top, barWidth + 1, barHeight)


				context.fillStyle = 'magenta'
				const maxY = Math.max(1, height - ((biMax / max) * height))
				context.fillRect(left, maxY - 1, barWidth, 1)

				context.fillStyle = 'magenta'
				const minY = height - ((biMin / max) * height)
				context.fillRect(left, minY + 1, barWidth, 1)

			}


			if(threshold) {
				_renderThresholdLine(context, threshold.high, { max, width, height, name: 'High', color: 'red' }, colors)
				_renderThresholdLine(context, threshold.low, { max, width, height, name: 'Low', color: 'blue' }, colors)
			}

			if(noPersistThreshold) {
				_renderThresholdLine(context, noPersistThreshold.high, { max, width, height, name: 'Non-Persist High', color: 'crimson' }, colors)
				_renderThresholdLine(context, noPersistThreshold.low, { max, width, height, name: 'Non-Persist Low', color: 'lightblue' }, colors)
			}

			context.setLineDash([])

			//
			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`Name: ${label}`, 10, 15)

			//
			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`Max: ${Math.trunc(max)} / ${Math.trunc(targetMax)}`, 10, 15 + fontHeight + 5)

			const currentAvg = buckets[index].avg

			//
			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`Current: ${Math.round(currentAvg)}`, 10, 15 + fontHeight + fontHeight + 5 + 5)
		}

		const render = (frame) => {
			renderGraph(this.#config.ch0)
			renderGraph(this.#config.ch1)

			if(this.#config.paused) { return }
			setTimeout(() => requestAnimationFrame(render), 1000 / 10)
		}

		// const controller = new AbortController()
		// const signal = AbortSignal.timeout(1000 * 10)
		// signal.addEventListener('abort', () => this.#config.paused = true)

		// const startGraph = () => {
		// 	this.#config.paused = false
		// 	acquireData(signal)
		// 	requestAnimationFrame(render)
		// }


		await refreshAll()

		return root
	}
}
