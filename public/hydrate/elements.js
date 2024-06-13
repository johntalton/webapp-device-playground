import { HTMLImportElement } from '../custom-elements/html-import.js'

import { I2CAddressDisplayElement } from '../custom-elements/address-display.js'

export function hydrateCustomeElementTemplateImport(importElemId, name, konstructor) {
	const element = document.getElementById(importElemId)

	const callback = (mutations, observer) => {
		// console.log('installing html (observed)', name)
		konstructor.template = element.firstChild
		customElements.define(name, konstructor)
		observer.disconnect()
	}

	const observer = new MutationObserver(callback)
	const config = { attributes: false, childList: true, subtree: true }
	observer.observe(element, config)


	element.addEventListener('loaded', event => {
		// console.log('installing html (loaded)', name)
		konstructor.template = element.firstChild
		customElements.define(name, konstructor)
		observer.disconnect()
	})

	// console.log('hydrateCustomElement', importElemId, name, element)
}

export async function hydrateCustomElements() {
	// console.log('hydrateCustomelements')
	customElements.define('html-import', HTMLImportElement)

	hydrateCustomeElementTemplateImport('addr-display', 'addr-display', I2CAddressDisplayElement)
}
