import { I2CAddressedBus } from '@johntalton/and-other-delights'
import {
	SSD1306,
	ADDRESS_MODE,
	HORIZONTAL_SCROLL_DIRECTION_RIGHT,
	SCROLL_FREQUENCY,
	HORIZONTAL_SCROLL_DIRECTION_LEFT
} from '@johntalton/ssd1306'
import { bindTabRoot } from '../util/tabs.js'

function imageDataAlphaToRAM(imageData) {
	const result = new Array(128 * 8)

	for(let page = 0; page < 8; page += 1) {
		for(let x = 0; x < 128; x += 1) {
			let current = 0b0000_0000

			for(let segmentY = 0; segmentY < 8; segmentY += 1) {
				const i = ((((page * 8) + segmentY) * 128) + x) * 4

				const r = imageData.data[i]
				const g = imageData.data[i + 1]
				const b = imageData.data[i + 2]
				const a = imageData.data[i + 3]

				// console.log('index', x, page, segmentY, i, r, g, b, a)

				if(a > 64) {
					current |= 0b1 << segmentY
				}
			}

			result[(page * 128) + x] = current
		}
	}

	return result
}


export class SSD1306Builder {
	#definition
	/** @type {SSD1306} */
	#device

	static async builder(definition, ui) {
		return new SSD1306Builder(definition, ui)
	}

	constructor(definition, ui) {
		this.#definition = definition
	}

	get title() { return 'SSD 1306 Display' }

	signature() {}

	async open() {
		const { bus, address } = this.#definition
		const abus = new I2CAddressedBus(bus, address)
		this.#device = SSD1306.from(abus)


		await this.#device.setAddressMode(ADDRESS_MODE.HORIZONTAL)
		await this.#device.setChargePump(true)
		// await this.#device.setDisplay(true)


		// await this.#device.setVerticalScrollArea(32, 20)
		// await this.#device.setVerticalAndHorizontalScrolling(HORIZONTAL_SCROLL_DIRECTION_LEFT, 0, 7, SCROLL_FREQUENCY.FRAMES_5, 1)
		// await this.#device.setContinuousHorizontalScrolling(HORIZONTAL_SCROLL_DIRECTION_RIGHT, 1, 6, SCROLL_FREQUENCY.FRAMES_5)
		// await this.#device.setScrolling(true)
	}

	async close() {}

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/ssd1306.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ssd1306-config')
		if (root === null) { throw new Error('no root for template') }



		const canvas = root.querySelector('canvas[data-preview]')
		const context = canvas?.getContext('2d')
		const inputSourcePicker = root.querySelector('input[name="sourcePicker"]')

		const checkboxEnable = root.querySelector('input[name="displayEnable"]')
		const selectInvert = root.querySelector('select[name="displayInvert"]')
		const selectAllOn = root.querySelector('select[name="displayAllOn"]')
		const rangeContrast = root.querySelector('input[name="contrast"]')

		const formScrolling = root.querySelector('form[data-form="scrolling"]')
		const buttonStartScroll = root.querySelector('button[command="--scrolling-start"]')
		const buttonStopScroll = root.querySelector('button[command="--scrolling-stop"]')
		// const selectScrollDirection = root.querySelector('input[name="scrollDirection"]')
		// const inputScrollStartPage = root.querySelector('input[name="scrollPageStart"]')
		// const inputScrollEndPage = root.querySelector('input[name="scrollPageEnd"]')
		// const selectScrollInterval = root.querySelector('select[name="scrollInterval"]')

		// const checkboxVerticalEnable = root.querySelector('input[name="enableVertical"]')
		// const inputVerticalOffset = root.querySelector('input[name="verticalOffset"]')
		// const inputVerticalAreaTop = root.querySelector('input[name="verticalAreaTop"]')
		// const inputVerticalAreaRows = root.querySelector('input[name="verticalAreaRows"]')

		const selectAddressMode = root.querySelector('select[name="addressMode"]')
		const inputAddressingPageStart = root.querySelector('input[name="pageStart"]')
		const inputAddressingPageEnd = root.querySelector('input[name="pageEnd"]')
		const inputAddressingColumnStart = root.querySelector('input[name="columnStart"]')
		const inputAddressingColumnEnd = root.querySelector('input[name="columnEnd"]')
		const inputAddressingPagingPage = root.querySelector('input[name="pagingPage"]')

		const selectFlipH = root.querySelector('select[name="flipHorizontal"]')
		const selectFlipV = root.querySelector('select[name="flipVertical"]')
		const rangeDisplayStartLine = root.querySelector('input[name="displayStartLine"]')

		const inputClockDivider = root.querySelector('input[name="divider"]')
		const inputOscillatorFrequency = root.querySelector('input[name="oscillator"]')
		const inputVCOMLevel = root.querySelector('input[name="vcomlevel"]')


		const { display } = await this.#device.status()
		checkboxEnable.checked = display

		checkboxEnable?.addEventListener('click', event => {
			checkboxEnable.disabled = true

			// async into void
			this.#device.setDisplay(checkboxEnable.checked)
				.finally(() => {
					checkboxEnable.disabled = false
				})
				.catch(e => console.warn(e))
		})


		selectAddressMode?.addEventListener('change', even => {
			const mode = (
				(selectAddressMode.value === 'horizontal') ? ADDRESS_MODE.HORIZONTAL :
				(selectAddressMode.value === 'vertical') ? ADDRESS_MODE.VERTICAL :
				ADDRESS_MODE.PAGE
			)

			this.#device.setAddressMode(mode)
				// .then(() => this.#device.writeData())
				.catch(e => console.warn(e))
		})

		selectInvert?.addEventListener('change', event => {
			this.#device.setDisplayInvert(selectInvert.value === 'true')
				.catch(e => console.warn(e))
		})

		selectAllOn?.addEventListener('change', event => {
			this.#device.setDisplayMode(selectAllOn.value === 'true')
				.catch(e => console.warn(e))
		})

		rangeContrast?.addEventListener('change', event => {
			const contrast = parseInt(rangeContrast.value)
			this.#device.setContrastControl(contrast)
				.catch(e => console.warn(e))
		})

		selectFlipH?.addEventListener('change', event => {
			this.#device.setComOutputScanDirection(selectFlipH.value === 'remap')
				.catch(e => console.warn(e))
		})

		selectFlipV?.addEventListener('change', event => {
			Promise.resolve()
				.then(async () => {
					await this.#device.setSegmentMap(selectFlipV.value === 'remap')
					console.log('Segment Map updates requires data write')
					// await this.#device.writeData()
				})
				.catch(e => console.warn(e))
		})

		rangeDisplayStartLine?.addEventListener('change', event => {
			const startLine = parseInt(rangeDisplayStartLine.value)
			this.#device.setDisplayStartLine(startLine)
				.catch(e => console.warn(e))
		})


		buttonStartScroll?.addEventListener('click', event => {

			const fd = new FormData(formScrolling)

			const direction = fd.get('scrollDirection') === 'left' ? HORIZONTAL_SCROLL_DIRECTION_LEFT : HORIZONTAL_SCROLL_DIRECTION_RIGHT
			const pageStart = parseInt(fd.get('scrollPageStart'))
			const pageEnd = parseInt(fd.get('scrollPageEnd'))
			const intervalFrames = parseInt(fd.get('scrollInterval'))
			const enableVertical = fd.get('enableVertical') === 'on'
			const offset = parseInt(fd.get('verticalOffset'))
			const areaTop = parseInt(fd.get('verticalAreaTop'))
			const areaRows = parseInt(fd.get('verticalAreaRows'))

			console.log({
				direction,
				pageStart,
				pageEnd,
				intervalFrames,
				enableVertical,
				offset,
				areaTop,
				areaRows
			})

			const FRAMES_TO_VALUE = new Map([
				[ 2, SCROLL_FREQUENCY.FRAMES_2 ],
				[ 3, SCROLL_FREQUENCY.FRAMES_3 ],
				[ 4, SCROLL_FREQUENCY.FRAMES_4 ],
				[ 5, SCROLL_FREQUENCY.FRAMES_5 ],
				[ 25, SCROLL_FREQUENCY.FRAMES_25 ],
				[ 64, SCROLL_FREQUENCY.FRAMES_64 ],
				[ 128, SCROLL_FREQUENCY.FRAMES_128 ],
				[ 256, SCROLL_FREQUENCY.FRAMES_256 ],
			])

			const interval = FRAMES_TO_VALUE.get(intervalFrames)

			Promise.resolve()
				.then(async () => {
					await this.#device.setScrolling(false)

					if(enableVertical) {
						await this.#device.setVerticalScrollArea(areaTop, areaRows)
						await this.#device.setVerticalAndHorizontalScrolling(direction, pageStart, pageEnd, interval, offset)
					}
					else {
						await this.#device.setContinuousHorizontalScrolling(direction, pageStart, pageEnd, interval)
					}

					await this.#device.setScrolling(true)
				})
				.catch(e => console.warn(e))

		})

		buttonStopScroll?.addEventListener('click', event => {
			this.#device.setScrolling(false)
				.catch(e => console.warn(e))
		})


		inputSourcePicker?.addEventListener('change', event => {
			const [ file ] = event.target.files

			if(file === null || file === undefined) { return }

			createImageBitmap(file)
				.then(imageBitmap => {
					const { width, height } = imageBitmap

					context.clearRect(0, 0, width, height)
					context.drawImage(imageBitmap, 0, 0, width, height)

					const offscreen = new OffscreenCanvas(width, height)
					const offscreenContext = offscreen.getContext('2d', {
						alpha: true,
						colorSpace: 'display-p3'
					})
					if(offscreenContext === null) { throw new Error('invalid offscreen context') }

					offscreenContext.imageSmoothingEnabled = false

					offscreenContext.drawImage(imageBitmap, 0, 0, width, height)
					const imageData = offscreenContext.getImageData(0, 0, width, height)

					const ramContent = imageDataAlphaToRAM(imageData)

					return this.#device.writeData(ramContent)
				})
				.catch(e => console.warn(e))
		})

		bindTabRoot(root)

		return root
	}
}
