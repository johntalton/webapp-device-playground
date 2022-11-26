import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import { segmentDisplayScript } from '../util/segment-display-script.js'

// System Setup
export const SS = 0b0010 << 4

export const OSCILLATOR_ON = 0b1
export const OSCILLATOR_OFF = 0b0

// Row/INT Set
export const RIS = 0b1010 << 4

// Display Setup
export const DS = 0b1000 << 4

export const DISPLAY_ON = 0b1
export const DISPLAY_OFF = 0b0

export const BLINK_OFF = 0b00 << 1
export const BLINK_2_HZ = 0b01 << 1
export const BLINK_1_HZ = 0b10 << 1
export const BLINK_HALF_HZ = 0b11 << 1

// Digital Dimming Data
export const DDD = 0b1110 << 4


// Key Data Memory 0x40 - 0x45
export const KDM = 0x40

// INT register flag
export const IRF = 0x60

function encodeLayoutDSEG7(digit) {
	// https://www.keshikan.net/fonts-e.html
	const dseg7 = {
		'a': 'A',
		'b': 'b',
		'c': 'c',
		'd': 'd',
		'e': 'E',
		'f': 'F',
		'g': 'G',
		'h': 'h',
		'i': 'i',
		'j': 'J',
		'k': 'k',
		'l': 'L',
		'm': 'M',
		'n': 'n',
		'o': 'o',
		'p': 'P',
		'q': 'q',
		'r': 'r',
		's': 'S',
		't': 't',
		'u': 'u',
		'v': 'V',
		'w': 'W',
		'x': 'X',
		'y': 'y',
		'z': 'Z',
	}

	return encodeLayoutDigit(dseg7[digit.toLowerCase()] ?? digit)
}

function encodeLayoutDigit(digit) {
	const font = {
		' ': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, DP: 0 },
		'-': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 1, DP: 0 },
		'_': { A: 0, B: 0, C: 0, D: 1, E: 0, F: 0, G: 0, DP: 0 },
		'.': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, DP: 1 },
		'°': { A: 1, B: 1, C: 0, D: 0, E: 0, F: 1, G: 1, DP: 0 },

		'0': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'1': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP: 0 },
		'2': { A: 1, B: 1, C: 0, D: 1, E: 1, F: 0, G: 1, DP: 0 },
		'3': { A: 1, B: 1, C: 1, D: 1, E: 0, F: 0, G: 1, DP: 0 },
		'4': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP: 0 },
		'5': { A: 1, B: 0, C: 1, D: 1, E: 0, F: 1, G: 1, DP: 0 },
		'6': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'7': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP: 0 },
		'8': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'9': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP: 0 },

		'b': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'c': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 0, G: 1, DP: 0 },
		'd': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 0, G: 1, DP: 0 },
		'h': { A: 0, B: 0, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'i': { A: 0, B: 0, C: 1, D: 0, E: 0, F: 0, G: 0, DP: 0 },
		'k': { A: 1, B: 0, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'n': { A: 0, B: 0, C: 1, D: 0, E: 1, F: 0, G: 1, DP: 0 },
		'o': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 0, G: 1, DP: 0 },
		'q': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP: 0 },
		'r': { A: 0, B: 0, C: 0, D: 0, E: 1, F: 0, G: 1, DP: 0 },
		't': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'u': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 0, G: 0, DP: 0 },
		'y': { A: 0, B: 1, C: 1, D: 1, E: 0, F: 1, G: 1, DP: 0 },


		'A': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'B': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'C': { A: 1, B: 0, C: 0, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'D': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'E': { A: 1, B: 0, C: 0, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'F': { A: 1, B: 0, C: 0, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'G': { A: 1, B: 0, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'H': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'I': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP: 0 },
		'I*': { A: 0, B: 0, C: 0, D: 0, E: 1, F: 1, G: 0, DP: 0 },
		'J': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 0, G: 0, DP: 0 },
		'K': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'L': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'M': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 0, DP: 0 },
		'N': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 0, DP: 0 },
		'O': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'P': { A: 1, B: 1, C: 0, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'S': { A: 0, B: 0, C: 1, D: 1, E: 0, F: 1, G: 1, DP: 0 },
		'U': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'V': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP: 0 },
		'W': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 0 },
		'X': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP: 0 },
		'Z': { A: 1, B: 1, C: 0, D: 1, E: 1, F: 0, G: 0, DP: 0 },
	}

	return font[digit] ?? { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 1 }
}

function encodeLayout_4Digit_7Segment_56(layout) {
	const DIGIT_MAP = [
		[7, 1],
		[6, 1],
		[5, 1],
		[4, 1],
		[3, 1],
		[2, 1],
		[1, 1],
		[0, 1],
	]

	function makeDigit({ A, B, C, D, E, F, G, DP }) {
		const digits = [DP, G, F, E, D, C, B, A]
		return BitSmush.smushBits(DIGIT_MAP, digits)
	}

	const digitOne = makeDigit(layout.digit.one)
	const digitTwo = makeDigit(layout.digit.two)
	const digitThree = makeDigit(layout.digit.three)
	const digitFour = makeDigit(layout.digit.four)

	const colon = layout.colon << 1

	return Uint8Array.from([
		0, digitOne,
		0, digitTwo,
		0, colon,
		0, digitThree,
		0, digitFour
	])
}

function encodeDigits_4Digit_7Segment_56(digits, colon) {
	return encodeLayout_4Digit_7Segment_56({
		colon: colon ? 1 : 0,
		digit: {
			one: encodeLayoutDSEG7(digits[0]),
			two: encodeLayoutDSEG7(digits[1]),
			three: encodeLayoutDSEG7(digits[2]),
			four: encodeLayoutDSEG7(digits[3])
		}
	})
}


function encodeTime_4Digit_7Segment_56(time, colon) {
	const h = time.getHours()
	const m = time.getMinutes()

	const g = (h > 12)
	const H = g ? h - 12 : h

	const [ digit0, digit1 ] = h.toString().padStart(2, g ? ' ' : '0').split('')
	const [ digit2, digit3 ] = m.toString().padStart(2, '0').split('')

	return encodeLayout_4Digit_7Segment_56({
		colon: colon ? 1 : 0,
		digit: {
			one: encodeLayoutDigit(digit0),
			two: encodeLayoutDigit(digit1),
			three: encodeLayoutDigit(digit2),
			four: encodeLayoutDigit(digit3)
		}
	})
}


function script_Time(abus) {
		let colon = false
		setInterval(async () => {
			colon = !colon
			const d = new Date()
			abus.i2cWrite(encodeTime_4Digit_7Segment_56(d, colon))
				.then()
				.catch(e => console.warn(e))
		}, 1000)
}

function script_Font(abus, input) {
		// const s = ' john 0123456789 -_. '
		// const s = 'abcdefghijklmnopqrstuvwxyz1234567890-_ ABCDEFGHIJKLMNOPQRSTUVWXYZ-_ aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ-_ '
		// const s = 'The Quick Brown Fox Jumped Over the Lazy Sleeping Dog -_.1234567890°'
		let s = input.value
		let i = 0
		setInterval(async () => {
			const sl = s.length
			const digit0 = s.charAt(i + 0 % sl)
			const digit1 = s.charAt((i + 1) % sl)
			const digit2 = s.charAt((i + 2) % sl)
			const digit3 = s.charAt((i + 3) % sl)
			i += 1
			if(i >= sl) { i = 0 }

			await abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
						colon: 0,
						digit: {
							one: encodeLayoutDSEG7(digit0),
							two: encodeLayoutDSEG7(digit1),
							three: encodeLayoutDSEG7(digit2),
							four: encodeLayoutDSEG7(digit3)
						}
					}))

		}, 500)

		input.addEventListener('keydown', e => {
			s = input.value
		})

}




function script_Count(abus) {

		let start = 0
		setInterval(async () => {
			start += 1
			if(start > 9999) { start = 0 }
			const digits = start.toString().padStart(4, 0).split('')

			await abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
				colon: 0,
				digit: {
					one: encodeLayoutDSEG7(digits[0]),
					two: encodeLayoutDSEG7(digits[1]),
					three: encodeLayoutDSEG7(digits[2]),
					four: encodeLayoutDSEG7(digits[3])
				}
			}))

		}, 100)

}



function script_Script(abus) {
	const s = segmentDisplayScript()
		.from('begin')
		.scroll('-_-_-_').forSeconds(10)
		.time().forMinutes(1)
		// .flash('SALE').forSeconds(5)
		// .scroll('buy now....').slow().once()

		// .display('.off').forSeconds(2)
		// .display('..on').forSeconds(2)
		.repeat('begin')

	const labels = new Map()

	const _handleAction = (s, stackIndex) => {
		console.log('..........handleAction', stackIndex)
		const action = s[stackIndex]

		if(action.type === 'scroll') {
			const { rate, text, seconds } = action
			const normalRate = 500
			const slowRate = 1000

			const scrollToEndOnce = seconds === undefined

			let count = 0
			const scroller = setInterval(() => {
				const len = text.length
				const digits =[
					text.charAt((count + 0 )% len),
					text.charAt((count + 1) % len),
					text.charAt((count + 2) % len),
					text.charAt((count + 3) % len),
				]

				count += 1

				const exitOnce = (scrollToEndOnce && (count > text.length - 4))

				if(exitOnce) {
					console.log('---', 'scroller once till end')
					clearInterval(scroller)
				}

				abus.i2cWrite(encodeDigits_4Digit_7Segment_56(digits, false))
					.then()
					.catch(e => console.warn(e))
					.finally(() => {
						if(exitOnce) {
							handleAction(s, stackIndex + 1)
						}
					})
			}, rate === 'normal' ? normalRate : slowRate)

			if(!scrollToEndOnce) {
				setTimeout(() => {
					console.log('---', 'scroll script over after', seconds)
					clearInterval(scroller)

					handleAction(s, stackIndex + 1)
				}, 1000 * seconds)
			}
		}

		if(action.type === 'label') {
			const { label } = action
			labels.set(label, stackIndex + 1)
			console.log(labels)

			handleAction(s, stackIndex + 1)
		}

		if(action.type == 'flash') {
			const { fourLetters, seconds } = action
			console.log(action)

			abus.i2cWrite(Uint8Array.from([DS | DISPLAY_ON | BLINK_1_HZ ]))
				.then(() =>
					abus.i2cWrite(encodeDigits_4Digit_7Segment_56(fourLetters, false)))
				.catch(e => console.warn(e))

			setTimeout(() => {
				abus.i2cWrite(Uint8Array.from([DS | DISPLAY_ON | BLINK_OFF ]))
					.then(() => {
						handleAction(s, stackIndex + 1)
					})
					.catch(e => console.warn(e))
			}, 1000 * seconds)
		}

		if(action.type === 'display') {
			const { fourLetters, seconds } = action
			abus.i2cWrite(encodeDigits_4Digit_7Segment_56(fourLetters, false))
				.then()
				.catch(e => console.warn(e))

			setTimeout(() => {
				console.log('---', 'text displayed for', seconds)

				handleAction(s, stackIndex + 1)
			}, 1000 * seconds)
		}

		if(action.type === 'time') {
			const { seconds } = action
			const rate = 500

			let toggle = true
			const scroller = setInterval(() => {
				abus.i2cWrite(encodeTime_4Digit_7Segment_56(new Date(), toggle))
					.then(() => {
						toggle = !toggle
					})
					.catch(e => console.warn(e))
			}, rate)

			setTimeout(() => {
				console.log('---', 'time up after', seconds)
				clearInterval(scroller)

				handleAction(s, stackIndex + 1)
			}, 1000 * seconds)
		}


		if(action.type === 'repeat') {
			const { label } = action
			const nextIndex = labels.get(label)
			console.log('jump idx', label, nextIndex)
			handleAction(s, nextIndex)
		}

		if(action.type === 'end') {
			abus.i2cWrite(encodeDigits_4Digit_7Segment_56('EOL.', false))
				.then()
				.catch(e => console.warn(e))
			console.log('END OF LINE.')
		}
	}

	const handleAction = (stack, index) => setTimeout(_handleAction, 50, stack, index)

	handleAction(s, 0)
}


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
		//this.#device = await PCA9536.from(this.#abus, {})

		await this.#abus.i2cWrite(Uint8Array.from([SS | OSCILLATOR_ON ]))
		await this.#abus.i2cWrite(Uint8Array.from([DS | DISPLAY_ON | BLINK_OFF ]))
		await this.#abus.i2cWrite(Uint8Array.from([DDD | 1 ]))

		await this.#abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
			colon: 0,
			digit: {
				one: encodeLayoutDSEG7('J'),
				two: encodeLayoutDSEG7('o'),
				three: encodeLayoutDSEG7('h'),
				four: encodeLayoutDSEG7('n')
			}
		}))
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
		const root = document.createElement('ht16k33-config')


		const input = document.createElement('input')
		input.value = 'the quick brown fox jumped over the lazy sleeping dog'

		root.appendChild(input)



		function buildButton(label, cb) {
			const b1 = document.createElement('button')
			b1.innerText = label
			b1.addEventListener('click', e => {
				// b1.toggleAttribute('disabled', true)
				b1.innerText = 'Stop'
				cb()
			})

			return b1
		}

		root.appendChild(buildButton('Script', () => script_Script(this.#abus)))
		root.appendChild(buildButton('Fast Count', () => script_Count(this.#abus)))
		root.appendChild(buildButton('Quick Fox', () => script_Font(this.#abus, input)))
		root.appendChild(buildButton('Time', () => script_Time(this.#abus)))


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