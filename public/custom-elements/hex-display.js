const OBSERVED_ATTRS = [ 'acked', 'arbitration', 'timedout'  ]

export class HEXAddressDisplayElement extends HTMLElement {
  static get observedAttributes() { return OBSERVED_ATTRS }
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = I2CAddressDisplayElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}

  attributeChangedCallback(name, oldValue, newValue) {

  }
}
