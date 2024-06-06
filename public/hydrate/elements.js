import { HTMLImportElement } from '../custom-elements/html-import.js'

import { I2CAddressDisplayElement } from '../custom-elements/address-display.js'
import { MCP2221ConfigElement } from '../custom-elements/mcp2221-config.js'
import { CaptureEventElement } from '../custom-elements/capture-event.js'
import { TCA9548ConfigElement } from '../custom-elements/tca9548-config.js'
import { PCF8523ConfigElement } from '../custom-elements/pcf8523-config.js'

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
	console.log('hydrateCustomelements')
	customElements.define('html-import', HTMLImportElement)

	hydrateCustomeElementTemplateImport('capture-event', 'capture-event', CaptureEventElement)
	hydrateCustomeElementTemplateImport('addr-display', 'addr-display', I2CAddressDisplayElement)
	hydrateCustomeElementTemplateImport('mcp2221-config', 'mcp2221-config', MCP2221ConfigElement)
	hydrateCustomeElementTemplateImport('tca9548-config', 'tca9548-config', TCA9548ConfigElement)
	hydrateCustomeElementTemplateImport('pcf8523-config', 'pcf8523-config', PCF8523ConfigElement)
}
