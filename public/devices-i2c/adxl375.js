import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { ADXL375 } from '@johntalton/adxl375'

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

export class ADXL375Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new ADXL375Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
		// this.#abus = I2CAddressedTransactionBus(bus, address)
	}

	get title() { return 'Accelerometer' }

	async open() {
		this.#device = await ADXL375.from(this.#abus)

		await this.#device.setDataFormat({
			selfTestEnabled: false,
			spi3WireEnabled: false,
			invertInterruptPolarity: false,
			justifyLeft: false
		})

		await this.#device.setBitrateAndPowerMode({
			reducedPowerMode: false,
			rate: 0b1100
		})


		await this.#device.setFIFOControl({
			mode: 'Stream',
			triggerLinkInterrupt2: false,
			samples: 10 // watermark
		})

		await this.#device.setPowerControl({
			measure: true
		})

		const df = await this.#device.getDataFormat()
		const fs = await this.#device.getFIFOStatus()
		const fc = await this.#device.getFIFOControl()
		const bw = await this.#device.getBitrateAndPowerMode()
		const pc = await this.#device.getPowerControl()

		const oX = await this.#device.getOffsetX()
		const oY = await this.#device.getOffsetY()
		const oZ = await this.#device.getOffsetZ()

		console.log(df, fs, fc, bw, pc, oX, oY, oZ)

	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('adxl375-config')

		const id = await this.#device.getID()
		root.toggleAttribute('data-valid-id', id.valid)

		const body = `
			<button type="button">Go ⚡️</button>

			<canvas data-X width="200" height="200"></canvas>
			<canvas data-Y width="200" height="200"></canvas>
			<canvas data-Z width="200" height="200"></canvas>
		`

		const node = (new DOMParser()).parseFromString(body, 'text/html')
		root.append(...node.body.childNodes)

		const buttonGo = root.querySelector('button')
		buttonGo.addEventListener('click', event => {
			console.log('hello')

			const max = {
				x: 1,
				y: 1,
				z: 1
			}
			const buffers = {
				x: [],
				y: [],
				z: []
			}

			const canvasX = root.querySelector('canvas[data-X]')
			const contextX = canvasX.getContext('2d', {})

			const canvasY= root.querySelector('canvas[data-Y]')
			const contextY = canvasY.getContext('2d', {})

			const canvasZ = root.querySelector('canvas[data-Z]')
			const contextZ = canvasZ.getContext('2d', {})



			const SAMPLE_COUNT = 100

			function renderGraph(canvas, context, points, max) {
				context.clearRect(0, 0, canvas.width, canvas.height)

				const stepX = canvas.width / SAMPLE_COUNT

				const startX = 0
				const startY = 0

				context.strokeStyle = 'black'
				context.lineWidth = 1

				context.beginPath()
				context.moveTo(startX, startY)

				points.forEach((value, index) => {
					const ratio = value / 50
					const curX = startX + index * stepX
					const curY = startY + 100 + (ratio * 100)
					context.lineTo(curX, curY)
				})

				context.stroke()
			}

			const render = (time) => {
				renderGraph(canvasX, contextX, buffers.x, max.x)
				renderGraph(canvasY, contextY, buffers.y, max.y)
				renderGraph(canvasZ, contextZ, buffers.z, max.z)
			}


			Promise.resolve().then(async () => {
				while(true) {
					await delayMs(100)

					const { entries } = await this.#device.getFIFOStatus()
					console.log('fetch', entries)

					if(entries === 0) {
						console.log('delay')
						await delayMs(100)
						continue
					}

					for(let e = 0; e < entries; e += 1) {
						const { x, y, z } = await this.#device.getXYZ()
						// await delayMs(1)

						buffers.x.push(x)
						buffers.y.push(y)
						buffers.z.push(z)

						// console.log(x, y, z)

						if(buffers.x.length > SAMPLE_COUNT) { buffers.x.shift() }
						if(buffers.y.length > SAMPLE_COUNT) { buffers.y.shift() }
						if(buffers.z.length > SAMPLE_COUNT) { buffers.z.shift() }
					}

					requestAnimationFrame(render)
				}
			})


			// let q = Promise.resolve()

			// const poll = setInterval(() => {
			// 	if(!Promise.is([ q ])) { console.log('skip un-settling'); return }

			// 	// this.#device.getFIFOStatus()
			// 	// Promise.resolve()
			// 	q = q
			// 		.then(async () => {
			// 			// console.log(fs)
			// 			const { entries } = await this.#device.getFIFOStatus()
			// 			console.log('fetch', entries)

			// 			if(entries === 0) {
			// 				return delayMs(100)
			// 			}

			// 			for(let e = 0; e < entries; e += 1) {
			// 				const { x, y, z } = await this.#device.getXYZ()
			// 				// await delayMs(1)

			// 				buffers.x.push(x)
			// 				buffers.y.push(y)
			// 				buffers.z.push(z)

			// 				// console.log(x, y, z)

			// 				if(buffers.x.length > SAMPLE_COUNT) { buffers.x.shift() }
			// 				if(buffers.y.length > SAMPLE_COUNT) { buffers.y.shift() }
			// 				if(buffers.z.length > SAMPLE_COUNT) { buffers.z.shift() }

			// 				// max.x = buffers.x.reduce((acc, x) => Math.max(acc, x), 0)
			// 				// max.y = buffers.y.reduce((acc, y) => Math.max(acc, y), 0)
			// 				// max.z = buffers.z.reduce((acc, z) => Math.max(acc, z), 0)
			// 			}

			// 			console.log('end fetch')

			// 			requestAnimationFrame(render)
			// 		})
			// 		// .catch(e => console.warn(e))
			// }, 1000 * .0125)
		})


		return root
	}
}
