import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { TSL2591, DEVICE_ID, GAIN_MODE_HIGH } from '@johntalton/tsl2591'
import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'
import { delayMs } from '../util/delay.js'
import { bindTabRoot } from '../util/tabs.js'

export class TSL2591Builder {
	#abus

	/** @type {TSL2591} */
	#device

	#config

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



		const refresh = async () => {
			const profile = await this.#device.getProfile()
			const thresholds = await this.#device.getThresholds()
			const status = await this.#device.getStatus()
			const deviceId = await this.#device.getDeviceID()

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


			this.#config.ch0.threshold.high = interruptHigh
			this.#config.ch0.threshold.low = interruptLow
			this.#config.ch1.threshold.high = noPersistInterruptHigh
			this.#config.ch1.threshold.low = noPersistInterruptLow

			const {
				noPersistInterruptFlag,
				interruptFlag,
				valid
			} = status

			const ok = deviceId === DEVICE_ID
			const deviceIdOutput = root?.querySelector('output[name="deviceID"]')
			deviceIdOutput.value = `0x${deviceId.toString(16)} ${ok ? '' : '🛑'}`

			const noPersistInterruptOutput = root?.querySelector('output[name="noPersistInterruptFlag"]')
			noPersistInterruptOutput.value = noPersistInterruptFlag ? '🔔 (true)' : '🔕'

			const interruptOutput = root?.querySelector('output[name="interruptFlag"]')
			interruptOutput.value = interruptFlag ? '🔔 (true)' : '🔕'

			const validOutput = root?.querySelector('output[name="valid"]')
			validOutput.value = valid ? '👍' : '👎 (false)'

		}

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

		bindTabRoot(root)



		// const dataTab = root.querySelector('button[data-tab="data"]')
		// const dataPollObserver = new MutationObserver((mutationList, observer) => {
		// 	const latestMutation = mutationList[mutationList.length - 1]

		// 	const activate = latestMutation.target.hasAttribute('data-active')

		// 	console.log(activate ? 'start Data watch' : 'end Data watch')
		// })
		// dataPollObserver.observe(dataTab, { attributes: true, attributeFilter: [ 'data-active'] })


		const ch0Canvas = root.querySelector('canvas[data-ch0]')
		const ch1Canvas = root.querySelector('canvas[data-ch1]')


		const DEFAULT_ITEM =  {
			sum: 0,
			total: 0,
			time: 0,
			min: Infinity,
			max: -Infinity,
			avg: 0
		}

		this.#config  = {
			colors: {},
			ch0: {
				label: 'Ch 0',
				height: ch0Canvas.height,
				width: ch0Canvas.width,
				canvas: ch0Canvas,
				context: ch0Canvas.getContext('2d', { colorSpace: 'display-p3' }),
				buckets: [...range(0, 60)].map(i => ({...DEFAULT_ITEM})),
				max: 100,
				targetMax: 100,
				threshold: {}
			},
			ch1: {
				label: 'Ch 1',
				height: ch1Canvas.height,
				width: ch1Canvas.width,
				canvas: ch1Canvas,
				context: ch1Canvas.getContext('2d', { colorSpace: 'display-p3' }),
				buckets: [...range(0, 60)].map(i => ({ ...DEFAULT_ITEM})),
				max: 100,
				targetMax: 100,
				threshold: {}
			}
		}


		Promise.resolve()
			.then(async () => {
				async function* colors(device) {
					while(true) {
						try {
							yield device.getColor()
						}
						catch(e) {
							// console.log('again?', e)
							await delayMs(1000 / 10)
						}
					}
				}

				for await (const { ch0, ch1 } of colors(this.#device)) {
					// console.log('some')
					await delayMs(1000 / 10)

					const now = Date.now()
					const index = Math.floor(now / 1000) % 60
					//console.log(index, ch0, ch1)

					const config = this.#config

					if((now - config.ch0.buckets[index].time) > (1 * 1000)) {
						// console.log('clear')
						config.ch0.buckets[index] = { ...DEFAULT_ITEM, time: now }
						config.ch1.buckets[index] = { ...DEFAULT_ITEM, time: now }
					}

					const bucket0Item = config.ch0.buckets[index]
					const bucket1Item = config.ch1.buckets[index]

					//
					bucket0Item.sum = bucket0Item.sum + ch0
					bucket0Item.total = bucket0Item.total + 1
					bucket0Item.max = Math.max(bucket0Item.max, ch0)
					bucket0Item.min = Math.min(bucket0Item.min, ch0)
					bucket0Item.avg = bucket0Item.sum / bucket0Item.total

					//
					bucket1Item.sum = bucket1Item.sum + ch1
					bucket1Item.total = bucket1Item.total + 1
					bucket1Item.max = Math.max(bucket1Item.max, ch1)
					bucket1Item.min = Math.min(bucket1Item.min, ch1)
					bucket1Item.avg = bucket1Item.sum / bucket1Item.total

					//
					config.ch0.targetMax = bucket0Item.avg * 1.5
					config.ch1.targetMax = bucket1Item.avg * 1.5

					const DELTA = 1

					if(Math.abs(config.ch0.targetMax - config.ch0.max) > 1) {
						config.ch0.max += (config.ch0.max > config.ch0.targetMax) ? -DELTA : DELTA
					}

					if(Math.abs(config.ch1.targetMax - config.ch1.max) > 1) {
						config.ch1.max += (config.ch1.max > config.ch1.targetMax) ? -DELTA : DELTA
					}

					// console.log(index, ch0, ch1, bucket1Item)
					// requestAnimationFrame(render)
				}
			})

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
				label
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
				const expired = ((subNow - buckets[bucketIndex].time) >= (60 * 1000))

				const { avg, max: biMax, min: biMin } = buckets[bucketIndex]

				const barHeight = height * (avg / max)

				const last = (offset === (60 - 1))

				const left = offset * barWidth - nudge
				const top = height - barHeight

				context.fillStyle = expired ? 'orange' : colors.current
				context.fillRect(left - 1, top, barWidth + 1, barHeight)


				context.fillStyle = 'pink'
				const maxY = Math.max(1, height - ((biMax / max) * height))
				context.fillRect(left, maxY - 1, barWidth, 1)

				context.fillStyle = 'lightblue'
				const minY = height - ((biMin / max) * height)
				context.fillRect(left, minY + 1, barWidth, 1)

			}

			const highOutOfBounds = threshold.high > max
			const lowOutOfBounds = threshold.low > max

			const highY = highOutOfBounds ? 0 : height - (height * threshold.high / max)
			const lowY = lowOutOfBounds ? 0 : height - (height * threshold.low / max)

			//context.lineWidth = 1

			//
			context.strokeStyle = 'red'
			context.setLineDash(highOutOfBounds ? [5, 5] : [])

			context.beginPath()
			context.moveTo(0, highY)
			context.lineTo(width, highY)
			context.stroke()

			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`High: ${Math.trunc(threshold.high)}`, 10, Math.min(height - 30, Math.max(30, Math.floor(highY) - 5)) )

			//
			context.strokeStyle = 'blue'
			context.setLineDash(lowOutOfBounds ? [5, 5] : [])

			context.beginPath()
			context.moveTo(0, lowY)
			context.lineTo(width, lowY)
			context.stroke()

			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`Low: ${Math.trunc(threshold.low)}`, 10, Math.max(Math.min(Math.floor(lowY), height) - 5, 60))

			context.setLineDash([])

			//
			context.fillStyle = colors.text
			context.font = colors.font
			context.fillText(`Max: ${Math.trunc(max)} / ${Math.trunc(targetMax)}`, 10, 15)
		}

		const render = (frame) => {
			renderGraph(this.#config.ch0)
			renderGraph(this.#config.ch1)

			setTimeout(() => requestAnimationFrame(render), 1000 / 10)
		}

		requestAnimationFrame(render)

		await refresh()

		return doc.body.children[0]
	}
}
