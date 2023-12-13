const OBSERVED_ATTRS = ['src']

export class HTMLImportElement extends HTMLElement {
	static get observedAttributes() { return OBSERVED_ATTRS }
	constructor() {
		super()
	}

	attributeChangedCallback(name, oldValue, newValue) {
		fetch(newValue, {

		})
			.then(result => result.text())
			.then(result => {
				this.innerHTML = result

				this.dispatchEvent(new CustomEvent('loaded'))

				// const parser = new DOMParser()
				// const stuff = parser.parseFromString(result, 'text/html')

				// this.appendChild(stuff.head.firstChild)
			})
			.catch(console.warn)
	}
}