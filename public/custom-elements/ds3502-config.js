
export class DS3502ConfigElement extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = DS3502ConfigElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}
}
