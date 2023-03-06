import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import {
	HT16K33, Segment,
	AdafruitMatrix8x8BiColor,
	Adafruit4Digit7SegmentBackpack,
	Adafruit4Digit14SegmentFeatherwing,
	Font14SegmentBespoke, Font7SegmentDSEG, Font7SegmentASCII, Font14SegmentOpenAI,
	FontUtil, Bespoke
} from '@johntalton/ht16k33'

import { segmentDisplayScript } from '../util/segment-display-script.js'

const FONT_LIST = {
	'dseg7': { name: 'DSEG7', font: Font7SegmentDSEG },
	'ascii': { name: 'ASCII', font: Font7SegmentASCII },
	'bespoke14': { name: 'Bespoke 14 Segment', font: Font14SegmentBespoke },
	'openIA14': { name: 'chatGPT 14', font: Font14SegmentOpenAI },
	'custom': { name: 'Custom' }
}
const LAYOUT_LIST = {
	'4x14featherwing': { name: '4 Digit 14 Segment (Adafruilt Featherwing)', layout: Adafruit4Digit14SegmentFeatherwing },
	'4x7backpack': { name: '4 Digit 8 Segment (Adafruilt Backpack)', layout: Adafruit4Digit7SegmentBackpack },
	'8x8x2': { name: 'BiColor 8x8 Matrix' }
}


const font_caseUpper_alignNatural = {
	...Bespoke,

	// '~': Bespoke['M'],
	// '!': Bespoke['W'],

	'*': 'HJKLMN',
	'A': 'BCG2KL',
	'Y': 'BFG1G2M',
	'W': 'BCEFLN',
	'M': 'BCEFHK',
	//'J': 'BCDL',
	'S': 'ACDG2H',
}

const font_caseLower_alignNatural = {
	'a': 'DEG1N',
	'b': 'DEFG1N',
	'c': 'DEG1',
	'd': 'BCDG2L',
	'e': 'DEG1L',
	'f': Bespoke['F'],
	'g': 'BCDG2K', // Bespoke['G'],
	'h': 'CG2JM',
	'i': 'M',
	'j': Bespoke['J'],
	'k': 'JKMN',
	'l': 'JM',
	'm': 'CEG1G2M',
	'n': 'CG2M', // 'EG1M'
	'o': 'CDEG1G2',
	'p': Bespoke['P'],
	'q': Bespoke['Q'],
	'r': 'EG1',
	's': Bespoke['S'],
	't': 'DEFG1', // 'G1G2JM',
	'u': 'CDE',
	'v': 'EL',
	'w': 'CDEM',
	'x': Bespoke['X'],
	'y': 'HKM',
	'z': 'DG1L'
}

const font_caseUL_alignNatural = {
	...font_caseUpper_alignNatural,
	...font_caseLower_alignNatural
}

const font_caseUL_alignLeft = {
	...font_caseUL_alignNatural,

	'h': 'EFG1M',
	'i': 'E',
	'l': 'EF',
	'n': 'EG1M',

	'y': 'EFG1K'
}

const font_caseUL_alignCenter = {
	...font_caseUL_alignNatural,

	't': 'G1G2JM',
	'r': 'G2M'
}

const font_caseUL_alignRight = {
	...font_caseUL_alignCenter,

	'i': 'C',
	'l': 'BC',
	't': 'BCDG2',

	'c': 'G2N',

	'y': 'BCG2H'
}


let Q = Promise.resolve()

function script_Time(device, root) {
		let colon = false
		let onOnce = false

		setInterval(() => {
			colon = !colon

			const d = new Date()
			const digit4 = Segment.encodeTime24_4Digit(d)

			const currentLayout = root.getAttribute('layout')
			const currentFont = root.getAttribute('font')

			const font = FONT_LIST[currentFont]?.font
			const layout = LAYOUT_LIST[currentLayout]?.layout

			if(layout === undefined) { return }
			if(font === undefined) { return }

			device.setMemory(layout.toLayout(font.encode4Digit(digit4, colon)))
				.then(() => {
					if(onOnce) { return }
					onOnce = true
					return device.setDisplay(true, 'off')
				})
				.catch(e => console.warn(e))
		}, 1000)
}

function script_Font(device, input) {
		// const s = ' john 0123456789 -_. '
		// const s = 'abcdefghijklmnopqrstuvwxyz1234567890-_ ABCDEFGHIJKLMNOPQRSTUVWXYZ-_ aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ-_ '
		// const s = 'The Quick Brown Fox Jumped Over the Lazy Sleeping Dog -_.1234567890°'
		let s = input.value
		let i = 0
		setInterval(() => {
			const sl = s.length
			const digit0 = s.charAt(i + 0 % sl)
			const digit1 = s.charAt((i + 1) % sl)
			const digit2 = s.charAt((i + 2) % sl)
			const digit3 = s.charAt((i + 3) % sl)
			i += 1
			if(i >= sl) { i = 0 }

			const dp = 0

			device.setMemory(Adafruit4Digit7SegmentBackpack({
						colon: 0,
						digit: {
							one: encodeLayoutDSEG7(digit0, dp),
							two: encodeLayoutDSEG7(digit1, dp),
							three: encodeLayoutDSEG7(digit2, dp),
							four: encodeLayoutDSEG7(digit3, dp)
						}
					}))
					.then()
					.catch(e => console.warn(e))

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

			await device.setMemory(Adafruit4Digit7SegmentBackpack({
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

				device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(Segment.encodeString_4Digit_SegmentASCII(digits, false)))
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
			device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(Segment.encodeString_4Digit_SegmentASCII(fourLetters, false)))
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

				device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(Segment.encodeTime24_4Digit_7Segment(d, toggle)))
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
			device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(Segment.encodeString_4Digit_SegmentASCII('EOL.', false)))
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

		abus.i2cWrite(Adafruit4Digit7SegmentBackpack({
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


		// abus.i2cWrite(Adafruit4Digit7SegmentBackpack({
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
			font === 'DSEG14' ? Segment.encodeString_4Digit_DSEG14 :
			() => { throw new Error('unknown font') }

		if (name === '8digit7seg-first-first') {
			Q = Q.then(() => device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(encodeString(first, false)))
				.then()
				.catch(e => console.warn(e)))
		} else if(name === '8digit7seg-first-second') {
			Q = Q.then(() => device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(encodeString(second, false)))
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

function script_Matrix(device) {
	// class Canvas {
	// 	#path = []
	// 	#cursor = { x: 0, y: 0 }
	// 	#state = {
	// 		stroke: 'black',
	// 		fill: 'black'

	// 	}

	// 	moveTo(point) { this.#cursor = point }
	// 	lineTo(point) {}

	// 	strokeRect(point, w, h) {}
	// 	fillRect(point, w, h) {}

	// }

	function simpleDDALine(p1, p2, c) {
		// port of: prog1 cs470 1/6/99
		const xDx = p1.x - p2.x
		const yDx = p1.y - p2.y

		const xDif = Math.abs(xDx)
		const yDif = Math.abs(yDx)

		const nStep = Math.trunc(Math.max(xDif, yDif))

		const xStep = - xDx / (nStep * 1.0)
		const yStep = - yDx / (nStep * 1.0)

		return [ ...new Array(nStep) ].map((_value, index) => {
			const x = Math.trunc(p1.x + (index * xStep))
			const y = Math.trunc(p1.y + (index * yStep))

			return setPixel({ x, y }, c)
		})
	}

	function setPixel(p, color) {
		return { x: p.x, y: p.y, color }
	}

	// const startT = now()
	const particles = [
		{
			x: 0,
			y: 0,
			dx: 0.1,
			dy: 0.3
		},
		{
			x: 0,
			y: 0,
			dx: 0.5,
			dy: 0.7
		},
		{
			x: 0,
			y: 0,
			dx: 0.25,
			dy: 0.1
		}
	]

	setInterval(() => {
		// const t = now() - startT / 1000

		particles.forEach(particle => {
			particle.x = particle.x + particle.dx
			particle.y = particle.y + particle.dy

			if(particle.x >= 8) { particle.x = 7; particle.dx = -particle.dx }
			if(particle.x < 0) { particle.x = 0; particle.dx = -particle.dx }

			if(particle.y >= 8) { particle.y = 7; particle.dy = -particle.dy }
			if(particle.y < 0) { particle.y = 0; particle.dy = -particle.dy }
		})


		const [ p1, p2, p3 ] = particles

		const lines = [
			...simpleDDALine(
				{ x: Math.trunc(p1.x), y: Math.trunc(p1.y) },
				{ x: Math.trunc(p2.x), y: Math.trunc(p2.y) },
				'red'
			),
			...simpleDDALine(
				{ x: Math.trunc(p2.x), y: Math.trunc(p2.y) },
				{ x: Math.trunc(p3.x), y: Math.trunc(p3.y) },
				'green'
			),
			...simpleDDALine(
				{ x: Math.trunc(p3.x), y: Math.trunc(p3.y) },
				{ x: Math.trunc(p1.x), y: Math.trunc(p1.y) },
				'yellow'
			)
		]


		const layout = AdafruitMatrix8x8BiColor.toLayout(lines)

		device.setMemory(layout)
			.then()
			.catch(e => console.warn(e))
	}, 1000 * 0.125)
}

// function script_AlphaPairs(device) {
// 	const pairOff = (accumulator, next, index, arr) => {
// 		if(index % 2 !== 0) { return accumulator }

// 		return [
// 			...accumulator,
// 			arr.slice(index, index + 2)
// 		]
// 	}

// 	const DUAL_UPPER_LOWER_ALPHABET = [ ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ' ].reduce(pairOff, []).map(([ one, two ]) => {
// 		const oneLower = one.toLowerCase()
// 		const oneUpper = one.toUpperCase()
// 		const twoLower = two.toLowerCase()
// 		const twoUpper = two.toUpperCase()

// 		return oneUpper + oneLower + twoUpper + twoLower
// 	})

// 	const delayS = (s) => new Promise(resolve => setTimeout(resolve, 1000 * s))


// 	for (const pair of DUAL_UPPER_LOWER_ALPHABET) {
// 		await device.setMemory(Adafruit4Digit14SegmentFeatherwing.toLayout(FontUtil.digits4FromSegmentMap(font_caseUL_alignNatural, pair)))
// 		await delayS(4)
// 	}

// }


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
		await this.#device.setDimming(0)
		await this.#device.setDisplay(false, 'off')

		await this.#device.setMemory(Segment.clearMemory())

		// const memory = await this.#device.getMemory()
		// console.log(memory)

		// await this.#device.setMemory(Adafruit4Digit7SegmentBackpack.toLayout(Font7SegmentDSEG.encode4Digit('WwMm')))
		// await this.#device.setMemory(Adafruit4Digit14SegmentFeatherwing.toLayout(Font14SegmentBespoke.encode4Digit('AYWJ')))
		// await this.#device.setMemory(Adafruit4Digit14SegmentFeatherwing.toLayout(FontUtil.digits4FromSegmentMap(font_caseUL_alignRight, 'PpSs')))

		await this.#device.setDisplay(true, 'off')
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {


		const root = document.createElement('ht16k33-config')
		root.setAttribute('layout', '')
		root.setAttribute('font', '')

		const layoutFontControlElem = document.createElement('header')
		const tabButtonsElem = document.createElement('div')
		tabButtonsElem.classList.add('tabs')
		const tabContentElem = document.createElement('div')
		tabContentElem.classList.add('tabsContent')


		const layoutSelectorElem = document.createElement('select')
		const fontSelectorElem = document.createElement('select')

		layoutSelectorElem.toggleAttribute('data-layout', true)
		fontSelectorElem.toggleAttribute('data-font', true)

		layoutFontControlElem.appendChild(layoutSelectorElem)
		layoutFontControlElem.appendChild(fontSelectorElem)

		root.appendChild(layoutFontControlElem)

		root.appendChild(tabButtonsElem)
		root.appendChild(tabContentElem)

		//
		const unselectedFontOptionElem = document.createElement('option')
		unselectedFontOptionElem.innerText = '<unselected>'
		unselectedFontOptionElem.disabled = true
		unselectedFontOptionElem.selected = true
		fontSelectorElem.appendChild(unselectedFontOptionElem)

		//
		const unselectedLayoutOptionElem = document.createElement('option')
		unselectedLayoutOptionElem.innerText = '<unselected>'
		unselectedLayoutOptionElem.disabled = true
		unselectedLayoutOptionElem.selected = true
		layoutSelectorElem.appendChild(unselectedLayoutOptionElem)

		//
		Object.entries(FONT_LIST).forEach(([key, fontItem]) => {
			const { name } = fontItem
			const option = document.createElement('option')
			option.innerText = name
			option.value = key

			fontSelectorElem.appendChild(option)
		})

		//
		Object.entries(LAYOUT_LIST).forEach(([key, layoutItem]) => {
			const { name } = layoutItem

			const option = document.createElement('option')
			option.innerText = name
			option.value = key

			layoutSelectorElem.appendChild(option)
		})

		//
		fontSelectorElem.addEventListener('change', e => {
			const target = e.target
			const [ selected, ] = target.selectedOptions

			root.setAttribute('font', selected.value)
		})

		//
		layoutSelectorElem.addEventListener('change', e => {
			const target = e.target
			const [ selected, ] = target.selectedOptions

			root.setAttribute('layout', selected.value)
		})





		// const input = document.createElement('input')
		// input.value = 'the quick brown fox jumped over the lazy sleeping dog'

		// root.appendChild(input)





		// const sectionMap = { ...layouts }

		// Object.entries(layouts).forEach(([key, layoutName]) => {
		// 	const section = document.createElement('section')
		// 	section.setAttribute('data-layout', key)

		// 	const title = document.createElement('span')
		// 	title.innerText = layoutName

		// 	section.appendChild(title)

		// 	root.appendChild(section)

		// 	sectionMap[key] = section
		// })



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

		// buildButton('Text', () => script_Font(this.#device, input))
		tabButtonsElem.appendChild(buildButton('Time', () => script_Time(this.#device, root)))
		// buildButton('Script', () => script_Script(this.#device))
		// buildButton('Fast Count', () => script_Count(this.#device))
		// buildButton('Game', () => script_Game(this.#device))

		tabButtonsElem.appendChild(buildButton('Channel', () => script_Channel(this.#device)))
		tabButtonsElem.appendChild(buildButton('Squawk', () => script_ChannelSquawk(this.#device)))

		tabButtonsElem.appendChild(buildButton('Matrix', () => script_Matrix(this.#device)))


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