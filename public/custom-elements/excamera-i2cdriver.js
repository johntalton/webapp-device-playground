
export class ExcameraI2CDriverElement extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = ExcameraI2CDriverElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}
}
