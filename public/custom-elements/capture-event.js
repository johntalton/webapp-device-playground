const OBSERVED_ATTRIBUTES = [ 'type' ]

export class CaptureEventElement extends HTMLElement {
  static get observedAttributes() { return OBSERVED_ATTRIBUTES }

	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = CaptureEventElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}

  attributeChangedCallback(name, oldValue, newValue) {
		const ceElem = this.shadowRoot.getElementById('ce')
		ceElem.setAttribute('type', newValue)

    switch(newValue) {
		case unknown:
		case null:
			break

		case 'start': break
		case 'stop': break
		case 'idle': break

		case '000': break
		case '001': break
		case '010': break
		case '011': break
		case '100': break
		case '101': break
		case '110': break
		case '111': break

    default:
			console.warn('unknown type', newValue)
			break
    }
  }
}
