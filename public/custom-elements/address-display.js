import { range } from '../util/range.js'

export class I2CAddressDisplayElement extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = I2CAddressDisplayElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))

		const listElem = this.shadowRoot.getElementById('list')

		for (const addr of range(0x08, 0x77)) {
			const liElem = document.createElement('li')
			liElem.setAttribute('part', 'items')

			const slotElem = document.createElement('slot')
			slotElem.setAttribute('name', addr)
			slotElem.textContent = addr.toString(16).padStart(2, '0')

			liElem.appendChild(slotElem)
			listElem.appendChild(liElem)
		}
	}
}
