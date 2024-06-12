export const OBSERVED_ATTRS = [ 'segments', 'seven', 'fourteen' ]

export const SEGMENT_7_NAMES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'DP',
  'colon'
]

export class SegmentDisplay extends HTMLElement {
  static segmentsSvg

  static get observedAttributes() { return OBSERVED_ATTRS }

	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = SegmentDisplay.segmentsSvg
	}

  attributeChangedCallback(name, oldValue, newValue) {
    if(name !== 'segments') { return }

    for(const segment of SEGMENT_7_NAMES) {
      const on = newValue.split(' ').includes(segment)

      const element = this.shadowRoot?.getElementById(segment)
      element.style.setProperty('--color', on ? 'var(--color-set)' : 'var(--color-unset)')

    }

  }
}


const response = await fetch('./custom-elements/segment.svg')
const view = await response.text()
SegmentDisplay.segmentsSvg = view
customElements.define('segment-display', SegmentDisplay)