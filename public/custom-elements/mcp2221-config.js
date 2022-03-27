
export class MCP2221ConfigElement extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = MCP2221ConfigElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}
}
