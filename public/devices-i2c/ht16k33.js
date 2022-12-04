import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import { HT16K33 } from '@johntalton/ht16k33'

import { segmentDisplayScript } from '../util/segment-display-script.js'



function encodeLayoutDSEG7(digit, DP) {
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

	return encodeLayoutDigit(dseg7[digit.toLowerCase()] ?? digit, DP)
}

function encodeLayoutDigit(digit, DP) {
	const font = {
		' ': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, DP },
		'-': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 1, DP },
		'_': { A: 0, B: 0, C: 0, D: 1, E: 0, F: 0, G: 0, DP },
		'.': { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, DP: 1 },
		'°': { A: 1, B: 1, C: 0, D: 0, E: 0, F: 1, G: 1, DP },

		'0': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'1': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP },
		'2': { A: 1, B: 1, C: 0, D: 1, E: 1, F: 0, G: 1, DP },
		'3': { A: 1, B: 1, C: 1, D: 1, E: 0, F: 0, G: 1, DP },
		'4': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP },
		'5': { A: 1, B: 0, C: 1, D: 1, E: 0, F: 1, G: 1, DP },
		'6': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 1, G: 1, DP },
		'7': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP },
		'8': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP },
		'9': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP },

		'b': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 1, G: 1, DP },
		'c': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 0, G: 1, DP },
		'd': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 0, G: 1, DP },
		'h': { A: 0, B: 0, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'i': { A: 0, B: 0, C: 1, D: 0, E: 0, F: 0, G: 0, DP },
		'k': { A: 1, B: 0, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'n': { A: 0, B: 0, C: 1, D: 0, E: 1, F: 0, G: 1, DP },
		'o': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 0, G: 1, DP },
		'q': { A: 1, B: 1, C: 1, D: 0, E: 0, F: 1, G: 1, DP },
		'r': { A: 0, B: 0, C: 0, D: 0, E: 1, F: 0, G: 1, DP },
		't': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 1, G: 1, DP },
		'u': { A: 0, B: 0, C: 1, D: 1, E: 1, F: 0, G: 0, DP },
		'y': { A: 0, B: 1, C: 1, D: 1, E: 0, F: 1, G: 1, DP },


		'A': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'B': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP },
		'C': { A: 1, B: 0, C: 0, D: 1, E: 1, F: 1, G: 0, DP },
		'D': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'E': { A: 1, B: 0, C: 0, D: 1, E: 1, F: 1, G: 1, DP },
		'F': { A: 1, B: 0, C: 0, D: 0, E: 1, F: 1, G: 1, DP },
		'G': { A: 1, B: 0, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'H': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'I': { A: 0, B: 1, C: 1, D: 0, E: 0, F: 0, G: 0, DP },
		'I*': { A: 0, B: 0, C: 0, D: 0, E: 1, F: 1, G: 0, DP },
		'J': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 0, G: 0, DP },
		'K': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'L': { A: 0, B: 0, C: 0, D: 1, E: 1, F: 1, G: 0, DP },
		'M': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 0, DP },
		'N': { A: 1, B: 1, C: 1, D: 0, E: 1, F: 1, G: 0, DP },
		'O': { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'P': { A: 1, B: 1, C: 0, D: 0, E: 1, F: 1, G: 1, DP },
		'S': { A: 0, B: 0, C: 1, D: 1, E: 0, F: 1, G: 1, DP },
		'U': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'V': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 0, DP },
		'W': { A: 0, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP },
		'X': { A: 0, B: 1, C: 1, D: 0, E: 1, F: 1, G: 1, DP },
		'Z': { A: 1, B: 1, C: 0, D: 1, E: 1, F: 0, G: 0, DP },
	}

	return font[digit] ?? { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, DP: 1 }
}

function encodeLayout_4Digit_7Segment_56(layout) {
	// console.log({ layout })

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
	const dp = 0

	return encodeLayout_4Digit_7Segment_56({
		colon: colon ? 1 : 0,
		digit: {
			one: encodeLayoutDSEG7(digits[0], dp),
			two: encodeLayoutDSEG7(digits[1], dp),
			three: encodeLayoutDSEG7(digits[2], dp),
			four: encodeLayoutDSEG7(digits[3], dp)
		}
	})
}

function encodeTime24_4Digit_7Segment_56(time, colon) {
	const dp = 0

	const h = time.getHours()
	const m = time.getMinutes()

	const [ digit0, digit1 ] = h.toString().padStart(2, '0').split('')
	const [ digit2, digit3 ] = m.toString().padStart(2, '0').split('')

	return encodeLayout_4Digit_7Segment_56({
		colon: colon ? 1 : 0,
		digit: {
			one: encodeLayoutDigit(digit0, dp),
			two: encodeLayoutDigit(digit1, dp),
			three: encodeLayoutDigit(digit2, dp),
			four: encodeLayoutDigit(digit3, dp)
		}
	})
}

function encodeTime12_4Digit_7Segment_56(time, colon) {
	const dp = 0

	const h = time.getHours()
	const m = time.getMinutes()

	const pm = h > 12
	const H = pm ? h - 12 : h

	const [ digit0, digit1 ] = H.toString().padStart(2, ' ').split('')
	const [ digit2, digit3 ] = m.toString().padStart(2, '0').split('')

	return encodeLayout_4Digit_7Segment_56({
		colon: colon ? 1 : 0,
		digit: {
			one: encodeLayoutDigit(digit0, dp),
			two: encodeLayoutDigit(digit1, dp),
			three: encodeLayoutDigit(digit2, dp),
			four: encodeLayoutDigit(digit3, dp)
		}
	})
}



function script_Time(abus) {
		let colon = false
		setInterval(async () => {
			colon = !colon
			const d = new Date()
			abus.i2cWrite(encodeTime24_4Digit_7Segment_56(d, colon))
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

			const dp = 0

			await abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
						colon: 0,
						digit: {
							one: encodeLayoutDSEG7(digit0, dp),
							two: encodeLayoutDSEG7(digit1, dp),
							three: encodeLayoutDSEG7(digit2, dp),
							four: encodeLayoutDSEG7(digit3, dp)
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

			const dp = 0

			await abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
				colon: 0,
				digit: {
					one: encodeLayoutDSEG7(digits[0], dp),
					two: encodeLayoutDSEG7(digits[1], dp),
					three: encodeLayoutDSEG7(digits[2], dp),
					four: encodeLayoutDSEG7(digits[3], dp)
				}
			}))

		}, 100)

}

function script_Script(abus) {
	const s = segmentDisplayScript()
		.from('begin')
		.scroll('-_-_-_').forSeconds(2)
		.time().forMinutes(5)
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
			let lastD = undefined

			const scroller = setInterval(() => {
				const d = new Date()
				const diff = lastD ? Math.trunc(d.getTime() / (1000 * 60)) - Math.trunc(lastD.getTime() / (1000 * 60)) : 1

				if(diff < 1) { return }

				console.log('update and cache time')
				lastD = d

				abus.i2cWrite(encodeTime24_4Digit_7Segment_56(d, toggle))
					.then(() => {
						toggle = !toggle
					})
					.catch(e => console.warn(e))
					.finally(() => {
						console.log('cache time')
						lastD = d
					})
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

function script_Game(abus) {
	function encodeLayoutBoard(board, digit) {
		const ri = digit
		const ci = digit * 2

		const a = board.row[0][ri]
		const b = board.column[0][ci + 1]
		const c = board.column[1][ci + 1]
		const d = board.row[2][ri]
		const e = board.column[1][ci]
		const f = board.column[0][ci]
		const g = board.row[1][ri]

		const DP = ((a * b * c * d * e * f * g) < 0) ? 1 : 0

		return {
			A: Math.abs(a),
			B: Math.abs(b),
			C: Math.abs(c),
			D: Math.abs(d),
			E: Math.abs(e),
			F: Math.abs(f),
			G: Math.abs(g),
			DP
		}
	}

	const state = {
		board: {
			row: [
				[  0,  0,  1,  1 ],
				[ -1,  0,  0,  0 ],
				[  0,  0,  0,  1 ]
			],
			column: [
				[  0,  0,   0,  0,   0,  0,   1,  1 ],
				[ -1,  0,   0,  0,   0,  0,   0,  1 ]
			]
		}
	}

	function applyGravity(board) {
		function gravity(line) {
			let playerIndex = line.indexOf(-1)
			if(playerIndex < 0) { return }
			if(playerIndex >= line.length - 1) { throw new Error('un-solidified player at bottom') }

			line[playerIndex] = 0
			playerIndex += 1

			const atBottom = playerIndex >= (line.length - 1)
			const nextTaken = !atBottom && (line[playerIndex + 1] !== 0)
			const solidify = atBottom || nextTaken

			line[playerIndex] = solidify ? 1 : -1
		}

		gravity(board.row[0])
		gravity(board.row[1])
		gravity(board.row[2])

		gravity(board.column[0])
		gravity(board.column[1])
	}

	function handleBoardUpdate() {


		applyGravity(state.board)

		abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
			colon: 0,
			digit: {
				one: encodeLayoutBoard(state.board, 0),
				two: encodeLayoutBoard(state.board, 1),
				three: encodeLayoutBoard(state.board, 2),
				four: encodeLayoutBoard(state.board, 3),
			}
		}))
		.then(() => {
			setTimeout(handleBoardUpdate, 1500)
		})
		.catch(e => console.warn(e))
	}



	window.addEventListener('keydown', e => {
		console.log(e.code)
		if(e.code === 'Space') {
			//
			handleBoardUpdate()
		}

		const hasRow0 = state.board.row[0].includes(-1)
		const hasRow1 = state.board.row[1].includes(-1)
		const hasRow2 = state.board.row[2].includes(-1)

		const hasCol0 = state.board.column[0].includes(-1)
		const hasCol1 = state.board.column[1].includes(-1)

		const hasRow = hasRow0 || hasRow1 || hasRow2
		const hasCol =  hasCol0 || hasCol1

		function applyVertical(line, targetLine) {
			const playerIndex = line.indexOf(-1)

			const target = targetLine[playerIndex]
			if(target !== 0) { return }

			line[playerIndex] = 0
			line = targetLine

			const atBottom = playerIndex >= (line.length - 1)
			const nextTaken = !atBottom && (line[playerIndex + 1] !== 0)
			const solidify = atBottom || nextTaken

			line[playerIndex] = solidify ? 1 : -1
		}

		if(e.code === 'ArrowUp') {
			if(hasRow) {
				if(hasRow0) { return }
				if(hasRow1) {
					const line = state.board.row[1]
					const targetLine = state.board.row[0]
					applyVertical(line, targetLine)
				}
				if(hasRow2) {
					const line = state.board.row[2]
					const targetLine = state.board.row[1]
					applyVertical(line, targetLine)
				}
			}
			else if(hasCol) {
				if(hasCol0) { return }
				if(hasCol1) {
					const line = state.board.column[1]
					const targetLine = state.board.column[0]
					applyVertical(line, targetLine)
				}
			}
		}
		else if(e.code === 'ArrowDown') {
			if(hasRow) {
				if(hasRow0) {
					const line = state.board.row[0]
					const targetLine = state.board.row[1]
					applyVertical(line, targetLine)
				}
				if(hasRow1) {
					const line = state.board.row[1]
					const targetLine = state.board.row[2]
					applyVertical(line, targetLine)
				}
				if(hasRow2) { return }
			}
			else if(hasCol) {
				if(hasCol0) {
					const line = state.board.colum[0]
					const targetLine = state.board.colum[1]
					applyVertical(line, targetLine)
				}
				if(hasCol1) { return }
			}
		}
		else if(e.code === 'ArrowLeft') {

		}
		else if(e.code === 'ArrowRight') {

		}


		// abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
		// 	colon: 0,
		// 	digit: {
		// 		one: encodeLayoutBoard(state.board, 0),
		// 		two: encodeLayoutBoard(state.board, 1),
		// 		three: encodeLayoutBoard(state.board, 2),
		// 		four: encodeLayoutBoard(state.board, 3),
		// 	}
		// }))
		// .then(() => {
		// 	setTimeout(handleBoardUpdate, 1500)
		// })
		// .catch(e => console.warn(e))
	})

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

		const driver = new HT16K33()
		driver.open()

		await this.#abus.i2cWrite(encodeLayout_4Digit_7Segment_56({
			colon: 0,
			digit: {
				one: encodeLayoutDSEG7('_', 1),
				two: encodeLayoutDSEG7('_', 1),
				three: encodeLayoutDSEG7('_', 1),
				four: encodeLayoutDSEG7('_', 1)
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

		root.appendChild(buildButton('Quick Fox', () => script_Font(this.#abus, input)))
		root.appendChild(buildButton('Time', () => script_Time(this.#abus)))
		root.appendChild(buildButton('Script', () => script_Script(this.#abus)))
		root.appendChild(buildButton('Fast Count', () => script_Count(this.#abus)))
		root.appendChild(buildButton('Game', () => script_Game(this.#abus)))


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