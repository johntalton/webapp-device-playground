const OBSERVED_ATTRIBUTES = [ 'ampm-mode', 'century' ]

export class PCF8523ConfigElement extends HTMLElement {
  static get observedAttributes() { return OBSERVED_ATTRIBUTES }

	constructor() {
		super()

		this.attachInternals()

		// const shadowRoot = this.attachShadow({ mode: 'open' })
		// const { content } = PCF8523ConfigElement.template
		// this.shadowRoot.appendChild(content.cloneNode(true))
    // Promise.resolve().then(() => this.appendChild(content.cloneNode(true)))
	}

	connectedCallback() {
		if(!this.isConnected) { return }

	}

	disconnectedCallback() {}
	adoptedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
  }
}
