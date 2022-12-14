import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import { HT16K33, Adafruit_LED_BP056, Segment } from '@johntalton/ht16k33'

import { segmentDisplayScript } from '../util/segment-display-script.js'


let Q = Promise.resolve()

function script_Time(device) {
		let colon = false
		setInterval(async () => {
			colon = !colon
			const d = new Date()

			device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeTime24_4Digit_7Segment(d, colon)))
				.then()
				.catch(e => console.warn(e))
		}, 1000)
}

function script_Font(device, input) {
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

			await device.setMemory(encodeLayout_4Digit_7Segment_56({
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

function script_Count(device) {

		let start = 0
		setInterval(async () => {
			start += 1
			if(start > 9999) { start = 0 }
			const digits = start.toString().padStart(4, 0).split('')

			const dp = 0

			await device.setMemory(encodeLayout_4Digit_7Segment_56({
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

function script_Script(device) {
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

				device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeString_4Digit_SegmentASCII(digits, false)))
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

			device.setDisplay(true, '1hz')
				.then(() =>
					abus.i2cWrite(encodeDigits_4Digit_7Segment_56(fourLetters, false)))
				.catch(e => console.warn(e))

			setTimeout(() => {
				device.setDisplay(true, 'off')
					.then(() => {
						handleAction(s, stackIndex + 1)
					})
					.catch(e => console.warn(e))
			}, 1000 * seconds)
		}

		if(action.type === 'display') {
			const { fourLetters, seconds } = action
			device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeString_4Digit_SegmentASCII(fourLetters, false)))
				.then()
				.catch(e => console.warn(e))

			setTimeout(() => {
				console.log('---', 'text displayed for', seconds)

				handleAction(s, stackIndex + 1)
			}, 1000 * seconds)
		}

		if(action.type === 'time') {
			const { seconds } = action
			const rate = 1000

			let toggle = true
			let lastD = undefined

			const scroller = setInterval(() => {
				const d = new Date()
				const diff = lastD ? Math.trunc(d.getTime() / (1000 * 60)) - Math.trunc(lastD.getTime() / (1000 * 60)) : 1

				if(diff < 1) { return }

				console.log('update and cache time')
				lastD = d

				device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeTime24_4Digit_7Segment(d, toggle)))
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
			device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeString_4Digit_SegmentASCII('EOL.', false)))
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

function script_Channel(device) {

	const channel = new BroadcastChannel('8digit7seg-first')

	function firstHalf(message) {
		return message.substring(0, 4)
	}

	function secondHalf(message) {
		return message.substring(4)
	}

	const NAME_MAP = {
		'excamera:bus:0x70': '8digit7seg-first-first',
		'excamera:bus:0x71': '8digit7seg-first-second'
	}

	channel.onmessage = msg => {
		const { data } = msg
		const { message, font } = data
		const first = firstHalf(message)
		const second = secondHalf(message)

		const name = NAME_MAP[device.name]

		const encodeString =
			font === 'segASCII' ? Segment.encodeString_4Digit_SegmentASCII :
			font === 'DSEG7' ?  Segment.encodeString_4Digit_DSEG7 :
			() => { throw new Error('unknown font') }

		if (name === '8digit7seg-first-first') {
			Q = Q.then(() => device.setMemory(Adafruit_LED_BP056.toLayout(encodeString(first, false)))
				.then()
				.catch(e => console.warn(e)))
		} else if(name === '8digit7seg-first-second') {
			Q = Q.then(() => device.setMemory(Adafruit_LED_BP056.toLayout(encodeString(second, false)))
				.then()
				.catch(e => console.warn(e)))
		}

	}
}

function script_ChannelSquawk() {
	const channel = new BroadcastChannel('8digit7seg-first')

	const ALPHA = 'The Quick Brow Fox Jumped Over The Lazy Sleeping Dog   '
	const DIGITS = 8
	const FONTS = [ 'segASCII', 'DSEG7' ]
	let fontAscii = true
	let idx = 0


	setInterval(() => {
		channel.postMessage({
			font: fontAscii ? FONTS[0] : FONTS[1],
			message: ALPHA.substring(idx, idx + DIGITS)
		})

		idx = idx >= (ALPHA.length - 1 - DIGITS) ? 0 : idx + 1
		fontAscii = idx === 0 ? !fontAscii : fontAscii
	}, 1000 * 0.5)
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
		this.#device = HT16K33.from(this.#abus)

		await this.#device.enableOscillator()
		await this.#device.setDisplay(true, 'off')
		await this.#device.setDimming(1)

		// await this.#device.setMemory({
		// 	com1: {
		// 		row1: true,
		// 		row2: true,
		// 		row3: true,
		// 		row4: false,

		// 		row6: true
		// 	},

		// 	com2: { row1: true },
		// })

		await this.#device.setMemory(Adafruit_LED_BP056.toLayout(Segment.encodeString_4Digit_SegmentASCII('_-_-')))
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

		root.appendChild(buildButton('Quick Fox', () => script_Font(this.#device, input)))
		root.appendChild(buildButton('Time', () => script_Time(this.#device)))
		root.appendChild(buildButton('Script', () => script_Script(this.#device)))
		root.appendChild(buildButton('Fast Count', () => script_Count(this.#device)))
		root.appendChild(buildButton('Game', () => script_Game(this.#device)))
		root.appendChild(buildButton('Channel', () => script_Channel(this.#device)))
		root.appendChild(buildButton('Squawk', () => script_ChannelSquawk(this.#device)))


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