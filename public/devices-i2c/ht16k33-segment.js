import {
	Bespoke,
	Font7SegmentASCII,
	Font7SegmentDSEG,
	Font14SegmentBespoke,
	Font14SegmentOpenAI,
} from '@johntalton/ht16k33/fonts'
import {
	Adafruit4Digit7SegmentBackpack,
	Adafruit4Digit14SegmentFeatherwing,
	AdafruitMatrix8x8BiColor,
} from '@johntalton/ht16k33/layouts'

export const FONT_LIST = {
	'dseg7': { name: 'DSEG7', font: Font7SegmentDSEG },
	'ascii': { name: 'ASCII', font: Font7SegmentASCII },
	'bespoke14': { name: 'Bespoke 14 Segment', font: Font14SegmentBespoke },
	'openIA14': { name: 'chatGPT 14', font: Font14SegmentOpenAI },
	'custom': { name: 'Custom' }
}

export const SEGMENT_LAYOUT_LIST = {
	'4x14featherwing': {
		name: '4 Digit 14 Segment (Adafruilt Featherwing)',
		layout: Adafruit4Digit14SegmentFeatherwing
	},
	'4x7backpack': {
		name: '4 Digit 7 Segment (Adafruilt Backpack)',
		layout: Adafruit4Digit7SegmentBackpack
	}
}

export function populateSegmentProduct(select) {
	select.append(...Object.entries(SEGMENT_LAYOUT_LIST).map(([key, item]) => {
		const option = document.createElement('option')
		option.value = key
		option.innerText = item.name
		return option
	}))
}

export function populateFont(select) {
	select.append(...Object.entries(FONT_LIST).map(([key, item]) => {
		const option = document.createElement('option')
		option.value = key
		option.innerText = item.name
		return option
	}))
}