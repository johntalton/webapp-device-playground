import {
	AdafruitMatrix8x8BiColor,
	Adafruit4Digit7SegmentBackpack,
	Adafruit4Digit14SegmentFeatherwing,
} from '@johntalton/ht16k33/layouts'
import {
	Font14SegmentBespoke,
	Font7SegmentDSEG,
	Font7SegmentASCII,
	Font14SegmentOpenAI,
	Bespoke
} from '@johntalton/ht16k33/fonts'



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