import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { HT16K33, Segment } from '@johntalton/ht16k33'

import { bindTabRoot } from '../util/tabs.js'
import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'
import { DOMTokenListLike } from '../util/dom-token-list.js'

import '../custom-elements/segment-display.js'
import { FONT_LIST, SEGMENT_LAYOUT_LIST, populateFont, populateSegmentProduct } from './ht16k33-segment.js'


export class HT16K33Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new HT16K33Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'HT16K33' }

	async open() {
		this.#device = HT16K33.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/ht16k33.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ht16k33-config')
		if (root === null) { throw new Error('no root for template') }

		const clearButton = root.querySelector('button[data-clear]')

		const setButton = root.querySelector('button[data-set-config]')
		const enableOscillatorCheckbox = root.querySelector('input[name="enableOscillator"]')
		const enableCheckbox = root.querySelector('input[name="enable"]')
		const blinkRateSelect = root.querySelector('select[name="blinkRate"]')
		const dimmingSlider = root.querySelector('input[name="dimming"]')

		const directForm = root.querySelector('form[data-direct]')

		const segmentProductSelect = root.querySelector('select[name="productSegmented"]')
		const segmentFontSelect = root.querySelector('select[name="font"]')
		const productURLOutput = root.querySelector('output[name="productUrl"]')

		const outputTypeSelect = root.querySelector('select[name="outputType"]')
		const segmentText = root.querySelector('input[name="segmentText"]')

		const segmentSetButton = root.querySelector('button[data-segment-set]')

		// populate Segment and Matrix Product listing
		populateSegmentProduct(segmentProductSelect)

		// populate Segment Font
		populateFont(segmentFontSelect)

		const refreshDirect = async () => {
			const memoryLayout = await this.#device.getMemory()

			;[ ...range(0, 8 - 1) ].forEach(com => {
				[ ...range(0, 16 - 1) ].forEach(row => {

					const value = memoryLayout[`com${com}`][`row${row}`]
					const checkbox = root.querySelector(`input[name="col${com}row${row}"]`)
					checkbox.checked = value
				})
			})

		}

		function _refreshSegment(encodedValue, productElement, name, colon = false) {
			const productSegment = productElement?.querySelector(`segment-display[name="${name}"]`)
			const segmentsAttr = productSegment?.getAttributeNode('segments')
			segmentsAttr.value = ''
			const dtl = new DOMTokenListLike(segmentsAttr)
			dtl.toggle('colon', colon)
			Object.entries(encodedValue).forEach(([ key, value ]) => {
				dtl.toggle(key, value)
			})
		}

		const refreshSegmented = async () => {
			const memoryLayout = await this.#device.getMemory()

			const segmentKey = segmentProductSelect.value
			const { layout } = SEGMENT_LAYOUT_LIST[segmentKey]

			const encodedText = layout.fromLayout(memoryLayout)

			const productElement = root.querySelector(`[data-product="${segmentKey}"]`)

			_refreshSegment(encodedText.digit.one, productElement, 'one')
			_refreshSegment(encodedText.digit.two, productElement, 'two', encodedText.colon)
			_refreshSegment(encodedText.digit.three, productElement, 'three')
			_refreshSegment(encodedText.digit.four, productElement, 'four')


		}

		const _refreshProductUrl = () => {
			const segmentKey = segmentProductSelect.value
			const { layout } = SEGMENT_LAYOUT_LIST[segmentKey]

			productURLOutput.value = layout.productUrl
			productURLOutput.closest('a').href = layout.productUrl
		}

		const _refreshOutputSelection = () => {
			const value = outputTypeSelect.item(outputTypeSelect.selectedIndex).value

			const participants = root.querySelectorAll('[data-output-type]')
			participants.forEach(p => {
				const enable = p.getAttribute('data-output-type') === value
				p.disabled = !enable
			})
		}


		segmentProductSelect?.addEventListener('change', event => {
			_refreshProductUrl()
		})

		segmentSetButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			segmentSetButton.disabled = true

			const segmentKey = segmentProductSelect.value
			const { layout } = SEGMENT_LAYOUT_LIST[segmentKey]

			const fontKey = segmentFontSelect.value
			const { font } = FONT_LIST[fontKey]


			const productElement = root.querySelector(`[data-product="${segmentKey}"]`)

			const type = outputTypeSelect.item(outputTypeSelect.selectedIndex).value




			// Temperal.Instant
			const digit4 = type === 'time' ?
				Segment.encodeTime24_4Digit(new Date(Date.now())) :
				segmentText?.value.padEnd(4, ' ')

			const encodedText = font.encode4Digit(digit4)
			encodedText.colon = type === 'time'

			const memoryLayout = layout.toLayout(encodedText)

			await this.#device.setMemory(memoryLayout)

			await refreshDirect()

			segmentSetButton.disabled = false


			_refreshSegment(encodedText.digit.one, productElement, 'one')
			_refreshSegment(encodedText.digit.two, productElement, 'two', encodedText.colon)
			_refreshSegment(encodedText.digit.three, productElement, 'three')
			_refreshSegment(encodedText.digit.four, productElement, 'four')

		}))

		outputTypeSelect?.addEventListener('change', asyncEvent(async event => {
			_refreshOutputSelection()
		}))





		clearButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			await this.#device.setMemory(Segment.clearMemory())
			await refreshDirect()

		}))

		setButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			const enableOscillator = enableOscillatorCheckbox.checked
			const enable = enableCheckbox.checked
			const rate = blinkRateSelect.value
			const value = parseInt(dimmingSlider.value)

			await this.#device.setOscillator(enableOscillator)
			await this.#device.setDisplay(enable, rate)
			await this.#device.setDimming(value)
		}))


		directForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			const layout = [ ...range(0, 8 - 1) ]
				.reduce((acc, com) => ({
						...acc,
						[`com${com}`]: [ ...range(0, 16 - 1) ]
							.reduce((acc, row) => ({
								...acc,
								[`row${row}`]: root.querySelector(`input[name="col${com}row${row}"]`).checked
							}), {})
					}), {})

			await this.#device.setMemory(layout)

			await refreshSegmented()
		}))



		bindTabRoot(root)

		_refreshProductUrl()
		_refreshOutputSelection()

		await refreshDirect()

		return root
	}
}


// window.addEventListener('freeze', e => {
// 	console.log('FREEEEEEZ')
// }, { capture: true })
// window.addEventListener('beforeunload', e => {
// 	console.log('BEFORE UNNNLOAD')
// }, { capture: true })
// window.addEventListener('blur', e => {
// 	console.log('BLUUURRURURURRR')
// }, { capture: true })
// window.addEventListener('visibilitychange', e => {
// 	console.log('VISSSSSSS', document.visibilityState)
// }, { capture: true })